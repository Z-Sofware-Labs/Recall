import ModalWindow from './common/ModalWindow';

interface Subtype {
  name: string;
  description: string;
}

const subtypes: Subtype[] = [
  { name: 'Traditional', description: 'The classic format: Learners analyze a statement and determine if it is factually True or False.' },
  { name: 'Modified', description: 'A phrase or word in the statement is underlined, and the student must answer True if it is correct, or provide the correct word if it is False.' },
];

export default function TrueFalseSubtypeModal({ 
  isOpen, 
  onClose, 
  onSelect 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (subtype: string) => void;
}) {
  return (
    <ModalWindow isOpen={isOpen} onClose={onClose} title="Select True or False Type" maxWidth="max-w-md">
      <div className="space-y-4">
        {subtypes.map((subtype) => (
          <button
            key={subtype.name}
            onClick={() => onSelect(subtype.name)}
            className="w-full text-left p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
          >
            <span className="block font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {subtype.name}
            </span>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {subtype.description}
            </p>
          </button>
        ))}
      </div>
    </ModalWindow>
  );
}

