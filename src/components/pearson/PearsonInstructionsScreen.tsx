"use client";

interface PearsonInstructionsScreenProps {
  questionCount: number;
  timeLimitMinutes: number;
  sectionHeading?: string;
}

function formatMinutes(minutes: number): string {
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

/**
 * Screen 3: Module instructions with 1-minute read countdown (header timer).
 */
export function PearsonInstructionsScreen({
  questionCount,
  timeLimitMinutes,
  sectionHeading,
}: PearsonInstructionsScreenProps) {
  return (
    <div className="pearson-static-content">
      {sectionHeading ? (
        <p>
          <strong>{sectionHeading}</strong>
        </p>
      ) : null}

      <p>
        <strong>You have 1 minute to read these instructions.</strong>
      </p>

      <table className="pearson-info-table">
        <thead>
          <tr>
            <th>Number of Questions</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{questionCount}</td>
            <td>{formatMinutes(timeLimitMinutes)}</td>
          </tr>
        </tbody>
      </table>

      <p>For each question, choose the one answer you consider correct.</p>
      <p>
        There are no penalties for incorrect responses, only marks for correct answers, so you
        should attempt all {questionCount} questions. Each question is worth one mark.
      </p>
      <p>
        Please click the <strong>Next (N)</strong> button to proceed.
      </p>
    </div>
  );
}
