import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a href="/" className="navbar-logo">
          MedPrep
        </a>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link href="/" className="navbar-link">
              Home
            </Link>
          </li>
            <li className="navbar-item">
            <Link href="/ucat-prep" className="navbar-link">
              UCAT Prep
            </Link>
          </li>
          <li className="navbar-item">
            <Link href="/mmi-prep" className="navbar-link">
              MMI Prep
            </Link>
          </li>
          <li className="navbar-item">
            <Link href="/profile" className="navbar-link">
              Profile
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}