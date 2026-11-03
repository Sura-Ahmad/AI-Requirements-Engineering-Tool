'use client';
import { Pencil, Check, X, Trash2 } from 'lucide-react';

export interface RequirementCardProps {
  req: any;
  editingId: string | null;
  editText: string;
  editError: string;
  savingId: string | null;
  deletingId: string | null;
  confirmDeleteId: string | null;
  issues: any[];
  onEdit: (req: any) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
  onEditTextChange: (v: string) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}

export default function RequirementCard({
  req, editingId, editText, editError, savingId, deletingId, confirmDeleteId,
  issues, onEdit, onSave, onCancel, onEditTextChange, onDelete, onConfirmDelete, onCancelDelete,
}: RequirementCardProps) {
  const reqIssues = issues.filter(i => i.requirement_id === req.id);
  const issue = reqIssues[0] ?? null;
  const issueColor = issue?.highlight_color ?? null;
  const isSaving = savingId === req.id;
  const isDeleting = deletingId === req.id;
  const isConfirmingDelete = confirmDeleteId === req.id;
  return (
    <div className="bg-white rounded-2xl border p-5 mb-3 transition-all"
      style={{ borderColor: issueColor || '#E5E7EB', borderLeftWidth: issueColor ? '4px' : '1px' }}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <span className="font-bold text-gray-800 text-sm">{req.code}</span>
          {editingId === req.id ? (
            <div className="mt-2">
              <textarea className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none text-sm resize-none" rows={3}
                value={editText} onChange={e => onEditTextChange(e.target.value)} autoFocus />
              {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={() => onSave(req.id)} disabled={isSaving} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white" style={{ background: '#4CAF50' }}>
                  <Check size={12} /> {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={onCancel} disabled={isSaving} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white" style={{ background: '#9CA3AF' }}>
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm mt-1">{req.description}</p>
          )}
        </div>
        {editingId !== req.id && !isConfirmingDelete && (
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <button onClick={() => onEdit(req)} className="text-gray-400 hover:text-gray-600">
              <Pencil size={16} />
            </button>
            <button onClick={() => onDelete(req.id)} disabled={isDeleting} className="text-gray-400 hover:text-red-500 disabled:opacity-40">
              {isDeleting ? <span className="text-xs">...</span> : <Trash2 size={16} />}
            </button>
          </div>
        )}
        {isConfirmingDelete && (
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <span className="text-xs text-gray-500">Delete?</span>
            <button onClick={() => onConfirmDelete(req.id)} className="text-xs px-2 py-1 rounded-full text-white" style={{ background: '#FF6B6B' }}>Yes</button>
            <button onClick={onCancelDelete} className="text-xs px-2 py-1 rounded-full text-white" style={{ background: '#9CA3AF' }}>No</button>
          </div>
        )}
      </div>
      {reqIssues.length > 0 && (
        <div className="mt-2 space-y-2">
          {reqIssues.map((iss, idx) => (
            <div key={idx}>
              <div className="text-xs px-2 py-1 rounded-full inline-block text-white mb-1"
                style={{ background: iss.highlight_color }}>
                {iss.issue_type}
              </div>
              {iss.issue_detail && (
                <p className="text-xs text-gray-600 mt-1"><span className="font-medium">Detail:</span> {iss.issue_detail}</p>
              )}
              {iss.conflict_with && iss.conflict_with !== 'N/A' && (
                <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Conflicts with:</span> {iss.conflict_with}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
