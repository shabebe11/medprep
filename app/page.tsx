import Image from "next/image";

export default function Home() {
  return (
    <div className="">
      <main className="">
        <div className="DailyMMI">
          <h1 className="DailyText">Daily MMI</h1>
          <p className="DailySubText">
            {/* retrieve random day number question from db */}
            Your daily dose of MMI practice questions.
          </p>
        </div>
      </main>
    </div>
  );
}
