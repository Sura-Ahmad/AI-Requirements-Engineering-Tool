'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDomains, getQuestions, createSession, processText, processDocument } from '@/lib/api';
import { ChevronLeft, ChevronRight, Heart, GraduationCap, DollarSign, Upload, FileText } from 'lucide-react';

const STEPS = ['Country & Domain', 'Role Selection', 'Questionnaire', 'Input Format', 'Review & Generate'];

const ROLES = [
  { id: 'product_owner', label: 'Product Owner', desc: 'Define product vision and priorities' },
  { id: 'business_analyst', label: 'Business Analyst', desc: 'Analyze and document business needs' },
  { id: 'developer', label: 'Developer', desc: 'Build and implement solutions' },
  { id: 'stakeholder', label: 'Stakeholder', desc: 'Provide business perspective' },
];

const COUNTRIES = [
  { code: 'JO', label: 'Jordan',       flag: '🇯🇴' },
  { code: 'SA', label: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'EG', label: 'Egypt',        flag: '🇪🇬' },
  { code: 'AE', label: 'UAE',          flag: '🇦🇪' },
];

const DOMAIN_ICONS: any = {
  Health: <Heart size={28} style={{ color: '#FF6B6B' }} />,
  Education: <GraduationCap size={28} style={{ color: '#6B8EFF' }} />,
  Finance: <DollarSign size={28} style={{ color: '#4CAF50' }} />,
};

export default function DashboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState('JO');
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputType, setInputType] = useState<'text' | 'file'>('text');
  const [inputText, setInputText] = useState('');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [processedText, setProcessedText] = useState('');
  const [piiDetected, setPiiDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedDomain(null);
    setDomains([]);
    setError('');
    setLoadingDomains(true);
    getDomains(country)
      .then(res => setDomains(res.data))
      .catch(() => setError('Unable to load domains. Please check your connection and try again.'))
      .finally(() => setLoadingDomains(false));
  }, [country]);

  useEffect(() => {
    if (selectedDomain) {
      getQuestions(selectedDomain.id)
        .then(res => setQuestions(res.data))
        .catch(() => setError('Domain is not ready yet. Please try again later.'));
    }
  }, [selectedDomain]);

  const handleNext = async () => {
    setError('');
    if (step === 0 && !selectedDomain) { setError('Please select a domain'); return; }
    if (step === 1 && !selectedRole) { setError('Please select a role'); return; }
    if (step === 3) {
      const hasAnswers = questions.some(q => answers[q.id]?.trim());
      const hasInput = (inputType === 'text' && inputText.trim()) || (inputType === 'file' && inputFile);
      if (!hasAnswers && !hasInput) {
        setError('Please either answer the questions or provide a document — at least one is required.');
        return;
      }
      try {
        setLoading(true);
        if (inputType === 'text' && inputText.trim()) {
          const res = await processText(inputText, 'temp');
          setProcessedText(res.data.processed_text);
          setPiiDetected(res.data.pii_detected ?? false);
        } else if (inputType === 'file' && inputFile) {
          const name = inputFile.name.toLowerCase();
          if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
            setError('Only PDF and Word (.docx) documents are supported. Please upload a valid file.');
            return;
          }
          const res = await processDocument(inputFile);
          setProcessedText(res.data.processed_text);
          setPiiDetected(res.data.pii_detected ?? false);
        }
      } catch { setError('Error processing input. Please check your file and try again.'); return; }
      finally { setLoading(false); }
    }
    if (step < 4) setStep(step + 1);
  };

  const handleGenerate = async () => {
    setLoading(true); setError('');
    try {
      const answersArray = questions.map(q => ({
        question_id: q.id,
        answer: answers[q.id] || ''
      }));
      const sessionRes = await createSession({
        domain_id: selectedDomain.id,
        country,
        role: selectedRole,
        answers: answersArray
      });
      const sessionId = sessionRes.data.id;
      if (processedText) localStorage.setItem(`doc_${sessionId}`, processedText);
      router.push(`/dashboard/requirements?session_id=${sessionId}`);
    } catch (e) { setError('Error creating session'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{ background: i <= step ? '#FF6B6B' : '#E5E7EB', color: i <= step ? 'white' : '#9CA3AF' }}>
                  {i + 1}
                </div>
                <span className="text-xs mt-1 text-gray-500 whitespace-nowrap">{s}</span>
              </div>
              {i < 4 && <div className="w-16 h-0.5 mx-2 mb-4" style={{ background: i < step ? '#FF6B6B' : '#E5E7EB' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-8 max-w-4xl mx-auto w-full">
        {error && <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl mb-6">{error}</div>}

        {/* Step 1: Country & Domain */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#1E2A4A' }}>Select Country & Domain</h2>
            <p className="text-gray-500 mb-6">Choose your location and the domain for your project</p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                ))}
              </select>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Domain</label>
            <div className="grid grid-cols-3 gap-4">
              {(domains ?? []).map(d => (
                <button key={d.id} onClick={() => setSelectedDomain(d)}
                  className="flex flex-col items-center p-6 rounded-2xl border-2 transition-all"
                  style={{ borderColor: selectedDomain?.id === d.id ? '#FF6B6B' : '#E5E7EB', background: selectedDomain?.id === d.id ? '#FFF5F5' : 'white' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: '#F3F4F6' }}>
                    {DOMAIN_ICONS[d.name] || <FileText size={28} />}
                  </div>
                  <span className="font-medium text-gray-800">{d.name}</span>
                </button>
              ))}
            </div>
            {!loadingDomains && domains.length === 0 && !error && (
              <p className="text-gray-400 text-sm mt-4 text-center">
                No domains are available for this country yet.
              </p>
            )}
          </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#1E2A4A' }}>Select Your Role</h2>
            <p className="text-gray-500 mb-6">Choose the role that best describes you</p>
            <div className="grid grid-cols-2 gap-4">
              {ROLES.map(r => (
                <button key={r.id} onClick={() => setSelectedRole(r.id)}
                  className="text-left p-6 rounded-2xl border-2 transition-all"
                  style={{ borderColor: selectedRole === r.id ? '#FF6B6B' : '#E5E7EB', background: selectedRole === r.id ? '#FFF5F5' : 'white' }}>
                  <p className="font-semibold text-gray-800 mb-1">{r.label}</p>
                  <p className="text-sm text-gray-500">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Questionnaire */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#1E2A4A' }}>Questionnaire</h2>
            <p className="text-gray-500 mb-6">Answer these questions to help us understand your needs. <span className="text-orange-400 font-medium">Optional</span> — you can skip and upload a document instead.</p>
            <div className="flex flex-col gap-6">
              {questions.map((q, i) => (
                <div key={q.id}>
                  <label className="block font-medium text-gray-800 mb-2">{i + 1}. {q.question_text}</label>
                  <textarea
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400 resize-none"
                    rows={3} placeholder="Enter your answer..."
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Input Format */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#1E2A4A' }}>Input Format</h2>
            <p className="text-gray-500 mb-6">Choose how you want to provide additional information</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[{ id: 'text', label: 'Text Input', icon: <FileText size={28} /> },
                { id: 'file', label: 'File Upload', icon: <Upload size={28} /> }].map(opt => (
                <button key={opt.id} onClick={() => setInputType(opt.id as any)}
                  className="flex flex-col items-center p-6 rounded-2xl border-2 transition-all"
                  style={{ borderColor: inputType === opt.id ? '#FF6B6B' : '#E5E7EB', background: inputType === opt.id ? '#FFF5F5' : 'white' }}>
                  <div style={{ color: '#FF6B6B' }}>{opt.icon}</div>
                  <span className="font-medium mt-2">{opt.label}</span>
                </button>
              ))}
            </div>
            {inputType === 'text' ? (
              <textarea className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none resize-none" rows={6}
                placeholder="Enter any additional requirements or details..."
                value={inputText} onChange={e => setInputText(e.target.value)} />
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <Upload size={32} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500 mb-3">Upload PDF or Word document</p>
                <input type="file" accept=".pdf,.docx" onChange={e => setInputFile(e.target.files?.[0] || null)}
                  className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="px-6 py-2 rounded-full text-white cursor-pointer text-sm font-medium"
                  style={{ background: '#FF6B6B' }}>Choose File</label>
                {inputFile && <p className="mt-3 text-sm text-gray-600">✓ {inputFile.name}</p>}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Generate */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#1E2A4A' }}>Review & Generate</h2>
            <p className="text-gray-500 mb-6">Review your selections before generating requirements</p>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">Summary</h3>
              {[
                { label: 'Country', value: `${COUNTRIES.find(c => c.code === country)?.flag} ${COUNTRIES.find(c => c.code === country)?.label}` },
                { label: 'Domain', value: selectedDomain?.name },
                { label: 'Role', value: ROLES.find(r => r.id === selectedRole)?.label },
                { label: 'Questions Answered', value: `${Object.keys(answers).length} / ${questions.length}` },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{item.label}:</span>
                  <span className="font-medium text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-orange-50 rounded-2xl p-4 text-center text-sm text-gray-600">
              Click "Generate Requirements" to create your comprehensive requirements document using AI
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-100 px-8 py-4 flex justify-between items-center">
        <button onClick={() => { if (step > 0) { setStep(step - 1); setError(''); } }}
          className="flex items-center gap-2 px-6 py-2 rounded-full border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all"
          style={{ opacity: step === 0 ? 0.4 : 1 }}>
          <ChevronLeft size={16} /> Back
        </button>
        {step < 4 ? (
          <button onClick={handleNext} disabled={loading}
            className="flex items-center gap-2 px-6 py-2 rounded-full text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ background: '#FF6B6B' }}>
            {loading ? 'Processing...' : 'Next'} <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleGenerate} disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-full text-white font-semibold transition-all hover:opacity-90"
            style={{ background: '#FF6B6B' }}>
            {loading ? 'Generating...' : 'Generate Requirements'} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
