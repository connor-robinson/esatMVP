"use client";

interface PearsonInstructionsScreenProps {
  questionCount: number;
}

/**
 * Screen 3: Module instructions table (Untimed).
 */
export function PearsonInstructionsScreen({
  questionCount,
}: PearsonInstructionsScreenProps) {
  return (
    <div className="pearson-static-content">
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
            <td>Untimed</td>
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
