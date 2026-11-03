'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, X, Check } from 'lucide-react';

type Toast = { type: 'success' | 'error'; message: string } | null;

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div
      className="fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium text-white"
      style={{ background: toast.type === 'success' ? '#4CAF50' : '#FF6B6B' }}
    >
      {toast.message}
    </div>
  );
}
import {
  getDomainsAdmin, createDomain, updateDomain, deleteDomain,
  getQuestionsAdmin, createQuestion, updateQuestion, deleteQuestion,
} from '@/lib/api';

interface Domain {
  id: string;
  name: string;
  country: string;
  is_active: boolean;
  created_at: string | null;
  sessions_count: number;
}

interface Question {
  id: string;
  domain_id: string;
  question_text: string;
  is_active: boolean;
}

const emptyDomainForm = { name: '', country: '' };
const emptyQuestionForm = { question_text: '' };

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [questionsMap, setQuestionsMap] = useState<Record<string, Question[]>>({});

  // Domain modal state
  const [domainModal, setDomainModal] = useState<{ open: boolean; editing: Domain | null }>({ open: false, editing: null });
  const [domainForm, setDomainForm] = useState(emptyDomainForm);
  const [domainSaving, setDomainSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  // Question modal state
  const [questionModal, setQuestionModal] = useState<{ open: boolean; domainId: string; editing: Question | null }>({
    open: false, domainId: '', editing: null,
  });
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [questionSaving, setQuestionSaving] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<
    | { type: 'domain'; id: string }
    | { type: 'question'; domainId: string; id: string }
    | null
  >(null);

  useEffect(() => { fetchDomains(); }, []);

  const fetchDomains = () => {
    setLoading(true);
    getDomainsAdmin().then(res => setDomains(res.data)).finally(() => setLoading(false));
  };

  const fetchQuestions = async (domainId: string) => {
    if (questionsMap[domainId]) return;
    const res = await getQuestionsAdmin(domainId);
    setQuestionsMap(prev => ({ ...prev, [domainId]: res.data }));
  };

  const toggleExpand = async (domainId: string) => {
    if (expandedDomain === domainId) {
      setExpandedDomain(null);
    } else {
      setExpandedDomain(domainId);
      await fetchQuestions(domainId);
    }
  };

  //  Domain CRUD 

  const openAddDomain = () => {
    setDomainForm(emptyDomainForm);
    setDomainModal({ open: true, editing: null });
  };

  const openEditDomain = (d: Domain) => {
    setDomainForm({ name: d.name, country: d.country });
    setDomainModal({ open: true, editing: d });
  };

  const saveDomain = async () => {
    if (!domainForm.name.trim() || !domainForm.country.trim()) {
      setToast({ type: 'error', message: 'Name and Country Code are required' });
      return;
    }
    setDomainSaving(true);
    try {
      if (domainModal.editing) {
        await updateDomain(domainModal.editing.id, domainForm);
        setDomains(prev => prev.map(d => d.id === domainModal.editing!.id ? { ...d, ...domainForm } : d));
      } else {
        const res = await createDomain(domainForm);
        setDomains(prev => [...prev, res.data]);
      }
      setDomainModal({ open: false, editing: null });
      setToast({ type: 'success', message: domainModal.editing ? 'Domain updated' : 'Domain created' });
    } catch (err: any) {
      setToast({ type: 'error', message: err?.response?.data?.detail ?? 'Failed to save domain' });
    } finally {
      setDomainSaving(false);
    }
  };

  const handleDeleteDomain = (id: string) => {
    setDeleteConfirm({ type: 'domain', id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'domain') {
        await deleteDomain(deleteConfirm.id);
        setDomains(prev => prev.filter(d => d.id !== deleteConfirm.id));
        setToast({ type: 'success', message: 'Domain deleted' });
      } else {
        await deleteQuestion(deleteConfirm.id);
        setQuestionsMap(prev => ({
          ...prev,
          [deleteConfirm.domainId]: prev[deleteConfirm.domainId].filter(q => q.id !== deleteConfirm.id),
        }));
        setToast({ type: 'success', message: 'Question deleted' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err?.response?.data?.detail ?? 'Failed to delete' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Question CRUD 

  const openAddQuestion = (domainId: string) => {
    setQuestionForm(emptyQuestionForm);
    setQuestionModal({ open: true, domainId, editing: null });
  };

  const openEditQuestion = (domainId: string, q: Question) => {
    setQuestionForm({ question_text: q.question_text });
    setQuestionModal({ open: true, domainId, editing: q });
  };

  const saveQuestion = async () => {
    if (!questionForm.question_text.trim()) {
      setToast({ type: 'error', message: 'Question text is required' });
      return;
    }
    setQuestionSaving(true);
    try {
      if (questionModal.editing) {
        const res = await updateQuestion(questionModal.editing.id, questionForm);
        setQuestionsMap(prev => ({
          ...prev,
          [questionModal.domainId]: prev[questionModal.domainId].map(q =>
            q.id === questionModal.editing!.id ? res.data : q
          ),
        }));
      } else {
        const res = await createQuestion(questionModal.domainId, questionForm);
        setQuestionsMap(prev => ({
          ...prev,
          [questionModal.domainId]: [...(prev[questionModal.domainId] || []), res.data],
        }));
      }
      setQuestionModal({ open: false, domainId: '', editing: null });
      setToast({ type: 'success', message: questionModal.editing ? 'Question updated' : 'Question created' });
    } catch (err: any) {
      setToast({ type: 'error', message: err?.response?.data?.detail ?? 'Failed to save question' });
    } finally {
      setQuestionSaving(false);
    }
  };

  const handleDeleteQuestion = (domainId: string, questionId: string) => {
    setDeleteConfirm({ type: 'question', domainId, id: questionId });
  };

  return (
    <>
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold" style={{ color: '#1E2A4A' }}>Domains & Questions</h1>
        <button onClick={openAddDomain}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
          style={{ background: '#FF6B6B' }}>
          <Plus size={15} /> Add Domain
        </button>
      </div>
      <p className="text-gray-500 mb-6">Manage domains and their questionnaires</p>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#FF6B6B' }} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {domains.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Domain row */}
              <div className="flex items-center px-5 py-4 gap-3">
                <button onClick={() => toggleExpand(d.id)} className="text-gray-400 hover:text-gray-600">
                  {expandedDomain === d.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="flex-1">
                  <span className="font-semibold text-gray-800">{d.name}</span>
                  <span className="ml-3 text-xs px-2 py-0.5 rounded-full uppercase"
                    style={{ background: '#1E2A4A12', color: '#1E2A4A' }}>{d.country}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: d.is_active ? '#4CAF5018' : '#FF6B6B18',
                    color: d.is_active ? '#4CAF50' : '#FF6B6B',
                  }}>
                  {d.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => openEditDomain(d)} className="text-gray-400 hover:text-gray-600 p-1">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDeleteDomain(d.id)} className="text-gray-400 hover:text-red-500 p-1">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Questions panel */}
              {expandedDomain === d.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-600">Questions</p>
                    <button onClick={() => openAddQuestion(d.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white font-medium hover:opacity-90"
                      style={{ background: '#1E2A4A' }}>
                      <Plus size={11} /> Add Question
                    </button>
                  </div>
                  {(questionsMap[d.id] || []).length === 0 ? (
                    <p className="text-gray-400 text-sm">No questions yet</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {questionsMap[d.id].map(q => (
                        <div key={q.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700">{q.question_text}</p>
                          </div>
                          <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: q.is_active ? '#4CAF5018' : '#FF6B6B18',
                              color: q.is_active ? '#4CAF50' : '#FF6B6B',
                            }}>
                            {q.is_active ? 'On' : 'Off'}
                          </span>
                          <button onClick={() => openEditQuestion(d.id, q)} className="text-gray-400 hover:text-gray-600 p-0.5 flex-shrink-0">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDeleteQuestion(d.id, q.id)} className="text-gray-400 hover:text-red-500 p-0.5 flex-shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {domains.length === 0 && (
            <p className="text-center text-gray-400 py-12">No domains found</p>
          )}
        </div>
      )}

      {/* Domain Modal */}
      {domainModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#1E2A4A' }}>
                {domainModal.editing ? 'Edit Domain' : 'Add Domain'}
              </h2>
              <button onClick={() => setDomainModal({ open: false, editing: null })} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Name (English)', field: 'name' as const, placeholder: 'Healthcare' },
                { label: 'Country Code', field: 'country' as const, placeholder: 'JO' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400 text-sm"
                    placeholder={placeholder}
                    value={domainForm[field]}
                    onChange={e => setDomainForm(prev => ({ ...prev, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveDomain} disabled={domainSaving}
                className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all"
                style={{ background: '#FF6B6B' }}>
                {domainSaving ? 'Saving...' : <span className="flex items-center justify-center gap-1"><Check size={14} /> Save</span>}
              </button>
              <button onClick={() => setDomainModal({ open: false, editing: null })}
                className="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all"
                style={{ background: '#F3F4F6', color: '#6B7280' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-2" style={{ color: '#1E2A4A' }}>Confirm Deletion</h2>
            <p className="text-sm text-gray-500 mb-6">
              {deleteConfirm.type === 'domain'
                ? 'This domain and all its questions will be permanently deleted. This cannot be undone.'
                : 'This question will be permanently deleted. This cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all"
                style={{ background: '#FF6B6B' }}>
                Delete
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all"
                style={{ background: '#F3F4F6', color: '#6B7280' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {questionModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#1E2A4A' }}>
                {questionModal.editing ? 'Edit Question' : 'Add Question'}
              </h2>
              <button onClick={() => setQuestionModal({ open: false, domainId: '', editing: null })} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400 text-sm resize-none"
                  rows={3}
                  placeholder="What is the primary purpose of the system?"
                  value={questionForm.question_text}
                  onChange={e => setQuestionForm(prev => ({ ...prev, question_text: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveQuestion} disabled={questionSaving}
                className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all"
                style={{ background: '#FF6B6B' }}>
                {questionSaving ? 'Saving...' : <span className="flex items-center justify-center gap-1"><Check size={14} /> Save</span>}
              </button>
              <button onClick={() => setQuestionModal({ open: false, domainId: '', editing: null })}
                className="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all"
                style={{ background: '#F3F4F6', color: '#6B7280' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
