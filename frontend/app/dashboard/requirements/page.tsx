'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { generateRequirements, getRequirements, updateRequirement, crossCheck, generateSRS, generateUseCases, getSessionById, deleteRequirement as deleteRequirementAPI, addRequirement } from '@/lib/api';
import { Check, X, Download, Plus } from 'lucide-react';
import { generateAndDownloadSRSWord, generateAndDownloadUseCasesWord } from '@/lib/generateSRSWord';
import RequirementCard from '@/components/RequirementCard';

const TABS = ['Functional Requirements', 'Non-Functional Requirements', 'Use Cases', 'Full SRS'];

const ROLE_LABELS: Record<string, string> = {
  product_owner: 'Product Owner',
  business_analyst: 'Business Analyst',
  developer: 'Developer',
  stakeholder: 'Stakeholder',
};

function RequirementsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id') || '';

  const [tab, setTab] = useState(0);
  const [functional, setFunctional] = useState<any[]>([]);
  const [nonFunctional, setNonFunctional] = useState<any[]>([]);
  const [useCases, setUseCases] = useState<any[]>([]);
  const [srs, setSrs] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingSRS, setGeneratingSRS] = useState(false);
  const [generatingUseCases, setGeneratingUseCases] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [issues, setIssues] = useState<any[]>([]);
  const [crossCheckDone, setCrossCheckDone] = useState(false);
  const [crossChecking, setCrossChecking] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [projectName, setProjectName] = useState('My Project');
  const [addingType, setAddingType] = useState<'functional' | 'non_functional' | null>(null);
  const [addText, setAddText] = useState('');
  const [addError, setAddError] = useState('');
  const [addingReq, setAddingReq] = useState(false);

  const initialized = useRef(false);

  useEffect(() => {
    if (!sessionId) { router.replace('/dashboard'); return; }
    if (initialized.current) return;
    initialized.current = true;
    loadOrGenerate();
    getSessionById(sessionId).then(res => setSessionInfo(res.data)).catch(() => {});
  }, [sessionId]);

  const loadOrGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const existing = await getRequirements(sessionId);
      const { functional: fn, non_functional: nfn } = existing.data;
      if (fn.length > 0 || nfn.length > 0) {
        setFunctional(fn);
        setNonFunctional(nfn);
        setAlreadyGenerated(true);
      } else {
        const docText = typeof window !== 'undefined' ? (localStorage.getItem(`doc_${sessionId}`) || '') : '';
        const res = await generateRequirements(sessionId, docText);
        setFunctional(res.data.functional);
        setNonFunctional(res.data.non_functional);
        setAlreadyGenerated(true);
        localStorage.removeItem(`doc_${sessionId}`);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error loading requirements');
    } finally { setLoading(false); }
  };

  const handleEdit = (req: any) => {
    setEditingId(req.id);
    setEditText(req.description);
    setEditError('');
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) { setEditError('Description cannot be empty'); return; }
    setSavingId(id);
    setEditError('');
    try {
      await updateRequirement(id, editText);
      setFunctional(prev => prev.map(r => r.id === id ? { ...r, description: editText } : r));
      setNonFunctional(prev => prev.map(r => r.id === id ? { ...r, description: editText } : r));
      setEditingId(null);
    } catch (e: any) {
      setEditError(e?.response?.data?.detail ?? 'Failed to save. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setEditingId(null);
    setEditError('');
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async (id: string) => {
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      await deleteRequirementAPI(id);
      setFunctional(prev => prev.filter(r => r.id !== id));
      setNonFunctional(prev => prev.filter(r => r.id !== id));
    } catch {
      setError('Failed to delete requirement. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddRequirement = async () => {
    if (!addText.trim()) { setAddError('Description cannot be empty'); return; }
    if (!addingType) return;
    setAddingReq(true);
    setAddError('');
    try {
      const res = await addRequirement(sessionId, addingType, addText);
      if (addingType === 'functional') {
        setFunctional(prev => [...prev, res.data]);
      } else {
        setNonFunctional(prev => [...prev, res.data]);
      }
      setAddingType(null);
      setAddText('');
    } catch (e: any) {
      setAddError(e?.response?.data?.detail ?? 'Failed to add requirement.');
    } finally {
      setAddingReq(false);
    }
  };

  const handleCrossCheck = async () => {
    setCrossChecking(true);
    setError('');
    setCrossCheckDone(false);
    try {
      const res = await crossCheck(sessionId);
      setIssues(res.data.issues);
      setCrossCheckDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Cross-check failed. Please try again.');
    } finally { setCrossChecking(false); }
  };

  const handleGenerateUseCases = async () => {
    setGeneratingUseCases(true);
    setError('');
    try {
      const res = await generateUseCases(sessionId);
      setUseCases(res.data.use_cases);
      setTab(2);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to generate use cases.');
    } finally { setGeneratingUseCases(false); }
  };

  const handleGenerateSRS = async () => {
    setGeneratingSRS(true);
    setError('');
    try {
      const res = await generateSRS(sessionId, projectName || 'My Project');
      setSrs(res.data.content);
      setTab(3);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to generate SRS.');
    } finally { setGeneratingSRS(false); }
  };

  const handleDownloadWord = () =>
    generateAndDownloadSRSWord(srs, functional, nonFunctional, projectName || 'My Project');

  const handleDownloadUseCasesWord = () =>
    generateAndDownloadUseCasesWord(useCases, projectName || 'My Project');

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const cardProps = {
    editingId, editText, editError, savingId, deletingId, confirmDeleteId, issues,
    onEdit: handleEdit,
    onSave: handleSaveEdit,
    onCancel: () => { setEditingId(null); setEditError(''); },
    onEditTextChange: setEditText,
    onDelete: handleDelete,
    onConfirmDelete: handleConfirmDelete,
    onCancelDelete: () => setConfirmDeleteId(null),
  };

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r border-gray-100 p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Session Info</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div><span className="text-gray-400">Domain:</span><p className="font-medium">{sessionInfo?.domain_name ?? '—'}</p></div>
            <div><span className="text-gray-400">Role:</span><p className="font-medium">{ROLE_LABELS[sessionInfo?.role] || sessionInfo?.role || '—'}</p></div>
            <div><span className="text-gray-400">Country:</span><p className="font-medium">{sessionInfo?.country ?? '—'}</p></div>
            <div><span className="text-gray-400">Created:</span><p className="font-medium">{fmt(sessionInfo?.created_at ?? null)}</p></div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="My Project"
            className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-blue-300"
          />
        </div>

        {alreadyGenerated && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: '#4CAF5018', color: '#4CAF50' }}>
            <span>✓</span> Requirements generated
          </div>
        )}

        <button onClick={handleCrossCheck} disabled={crossChecking || !alreadyGenerated}
          className="w-full py-3 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-40"
          style={{ background: '#FF6B6B' }}>
          {crossChecking ? 'Checking...' : 'Run Cross-Check'}
        </button>

        {crossCheckDone && issues.length === 0 && (
          <div className="text-xs px-3 py-2 rounded-xl" style={{ background: '#4CAF5018', color: '#4CAF50' }}>
            ✓ No issues found
          </div>
        )}
        {crossCheckDone && issues.length > 0 && (
          <div className="text-xs px-3 py-2 rounded-xl" style={{ background: '#FF6B6B18', color: '#FF6B6B' }}>
            {(() => { const n = new Set(issues.map((i: any) => i.requirement_id)).size; return `${n} requirement${n > 1 ? 's have' : ' has'} issues — see highlighted below`; })()}
          </div>
        )}

        {issues.length > 0 && (
          <div className="text-xs">
            <p className="font-medium text-gray-700 mb-2">Legend:</p>
            {[
              { color: '#FFA500', label: 'Ambiguity' },
              { color: '#FF6B6B', label: 'Duplicate' },
              { color: '#9B59B6', label: 'Inconsistency' },
              { color: '#FF0000', label: 'Conflict' },
              { color: '#3498DB', label: 'Unsupported' }
            ].map(i => (
              <div key={i.label} className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ background: i.color }} />
                <span className="text-gray-600">{i.label}</span>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="font-medium text-gray-700 mb-2 text-sm">Export</p>
          <button onClick={handleGenerateSRS} disabled={generatingSRS || generatingUseCases}
            className="w-full py-3 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 mb-2"
            style={{ background: '#FF6B6B' }}>
            {generatingSRS ? 'Generating...' : 'Generate SRS'}
          </button>
          <button onClick={handleGenerateUseCases} disabled={generatingSRS || generatingUseCases}
            className="w-full py-3 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90"
            style={{ background: '#FF6B6B' }}>
            {generatingUseCases ? 'Generating...' : 'Generate Use Cases'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E2A4A' }}>Requirements Dashboard</h1>
        <p className="text-gray-500 mb-6">View and manage your generated requirements</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4">
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 mb-4">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className="px-4 py-3 text-sm font-medium transition-all border-b-2"
              style={{ borderColor: tab === i ? '#FF6B6B' : 'transparent', color: tab === i ? '#FF6B6B' : '#6B7280' }}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin mx-auto mb-3" style={{ borderTopColor: '#FF6B6B' }} />
              <p className="text-gray-500 text-sm">Generating requirements with AI...</p>
            </div>
          </div>
        ) : (
          <>
            {tab === 0 && (
              <>
                {functional.map(r => <RequirementCard key={r.id} req={r} {...cardProps} />)}
                {addingType === 'functional' ? (
                  <div className="bg-white rounded-2xl border border-blue-200 p-5 mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">New Functional Requirement</p>
                    <textarea
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none text-sm resize-none" rows={3}
                      value={addText} onChange={e => setAddText(e.target.value)}
                      placeholder="Describe the requirement..." autoFocus />
                    {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleAddRequirement} disabled={addingReq} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white" style={{ background: '#4CAF50' }}>
                        <Check size={12} /> {addingReq ? 'Adding...' : 'Add'}
                      </button>
                      <button onClick={() => { setAddingType(null); setAddText(''); setAddError(''); }} disabled={addingReq} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white" style={{ background: '#9CA3AF' }}>
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingType('functional'); setAddText(''); setAddError(''); setEditingId(null); }}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mt-2 transition-all">
                    <Plus size={16} /> Add Requirement
                  </button>
                )}
              </>
            )}
            {tab === 1 && (
              <>
                {nonFunctional.map(r => <RequirementCard key={r.id} req={r} {...cardProps} />)}
                {addingType === 'non_functional' ? (
                  <div className="bg-white rounded-2xl border border-blue-200 p-5 mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">New Non-Functional Requirement</p>
                    <textarea
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none text-sm resize-none" rows={3}
                      value={addText} onChange={e => setAddText(e.target.value)}
                      placeholder="Describe the requirement..." autoFocus />
                    {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleAddRequirement} disabled={addingReq} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white" style={{ background: '#4CAF50' }}>
                        <Check size={12} /> {addingReq ? 'Adding...' : 'Add'}
                      </button>
                      <button onClick={() => { setAddingType(null); setAddText(''); setAddError(''); }} disabled={addingReq} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white" style={{ background: '#9CA3AF' }}>
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingType('non_functional'); setAddText(''); setAddError(''); setEditingId(null); }}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mt-2 transition-all">
                    <Plus size={16} /> Add Requirement
                  </button>
                )}
              </>
            )}
            {tab === 2 && (
              useCases.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p>Click "Generate Use Cases" to generate use cases</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleDownloadUseCasesWord}
                      className="flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-medium transition-all hover:opacity-90"
                      style={{ background: '#1E2A4A' }}
                    >
                      <Download size={16} /> Download as Word
                    </button>
                  </div>
                  {useCases.map((uc, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        {uc.use_case_id && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:'#FFF0F0',color:'#FF6B6B'}}>{uc.use_case_id}</span>}
                        {uc.priority && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{uc.priority}</span>}
                      </div>
                      <h3 className="font-bold text-gray-800 mb-3">{uc.title}</h3>
                      <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Actor:</span> {uc.actor}</p>
                      {uc.trigger && <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Trigger:</span> {uc.trigger}</p>}
                      <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Preconditions:</span> {uc.preconditions}</p>
                      <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Main Flow:</span> {uc.main_flow}</p>
                      {uc.alternative_flows && <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Alternative Flows:</span> {uc.alternative_flows}</p>}
                      {uc.exception_flows && <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Exception Flows:</span> {uc.exception_flows}</p>}
                      <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Postconditions:</span> {uc.postconditions}</p>
                      {uc.related_requirements && <p className="text-sm text-gray-500 mt-2 text-xs"><span className="font-medium">Related:</span> {uc.related_requirements}</p>}
                    </div>
                  ))}
                </>
              )
            )}
            {tab === 3 && (
              srs ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleDownloadWord}
                      className="flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-medium transition-all hover:opacity-90"
                      style={{ background: '#1E2A4A' }}
                    >
                      <Download size={16} /> Download as Word
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{srs}</pre>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <p>Click "Generate SRS" to generate the SRS document</p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function RequirementsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#FF6B6B' }} /></div>}>
      <RequirementsPageInner />
    </Suspense>
  );
}
