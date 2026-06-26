import { useNavigate } from 'react-router-dom';

export default function BackButton({ label = 'Back' }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="btn-outline nm-back-action-btn"
      style={{ marginRight: '0.75rem' }}
      title={label}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
        arrow_back
      </span>
      <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{label}</span>
    </button>
  );
}

