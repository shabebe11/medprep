export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-meta">
            <span>© 2025</span>
            <a
              href="https://shabebe1.com"
              className="footer-name-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              shuaib al khudairi
            </a>
            <span>Made with</span>
            <img src="nextjs.svg" alt="Next.js" className="tech-icon-small" />
            <span>Next.js</span>
            <span>+</span>
            <img src="css.svg" alt="css" className="tech-icon-small" />
            <span>CSS</span>
          </div>
        </div>

        <div className="footer-right">
          <div className="footer-links">
            <a
              href="mailto:alkhudairi.sa@gmail.com"
              className="footer-social-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="gmail.svg" alt="gmail" className="footer-social-icon" />
            </a>
            <a
              href="https://www.linkedin.com/in/shuaibalkhudairi/"
              className="footer-social-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="linkedin.svg"
                alt="LinkedIn"
                className="footer-social-icon"
              />
            </a>
            <a
              href="https://discord.com/users/shabebe"
              className="footer-social-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="discord.svg"
                alt="Discord"
                className="footer-social-icon"
              />
            </a>
          </div>
          {/* <a href="/resume.pdf" className="resume-link" target="_blank" rel="noopener noreferrer">
              Resume
            </a> */}
        </div>
      </div>
    </footer>
  );
}
