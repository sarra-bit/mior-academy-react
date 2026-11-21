import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link to="/" className="logo">
      <div className="logo-icon">M</div>
      <div className="logo-text">
        <h2>M.I.O.R Academy</h2>
        <span>Centre de Formation Professionnelle</span>
      </div>
    </Link>
  );
}
