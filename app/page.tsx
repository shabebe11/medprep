import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="">
      <main className="">
        <li className="navbar-item">
          <Link href="/mmi-prep">
          Continue to mmi prep
          </Link>
        </li>
        <li className="navbar-item">
          <Link href="/ucat-prep">
          continue to ucat prep
          </Link>
        </li>
      </main>
    </div>
  );
}
