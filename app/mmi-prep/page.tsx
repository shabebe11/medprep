export default function Home() {
    return(
    <div className="DailyMMI">
          <h1 className="DailyText">Daily MMI Question</h1>
          <p className="DailySubText">
            {/* retrieve random day number question from db */}
            Your daily dose of MMI practice questions.
          </p>
        </div>
    )
}