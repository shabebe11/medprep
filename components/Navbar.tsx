export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a href="/" className="navbar-logo">
          MedPrep
        </a>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <a href="/" className="navbar-link">
              Home
            </a>
          </li>
            <li className="navbar-item">
            <a href="/ucat-prep" className="navbar-link">
              UCAT Prep
            </a>
          </li>
          <li className="navbar-item">
            <a href="/mmi-prep" className="navbar-link">
              MMI Prep
            </a>
          </li>
          <li className="navbar-item">
            <a href="/profile" className="navbar-link">
              Profile
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}