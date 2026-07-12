export const GRADES = Object.freeze(
    [
        { minimumAccuracy: 95, minimumScore: 10_000, label: 'S', color: '#ffe066' },
        { minimumAccuracy: 90, minimumScore: null, label: 'A', color: '#7f7' },
        { minimumAccuracy: 75, minimumScore: null, label: 'B', color: '#7cf' },
        { minimumAccuracy: 60, minimumScore: null, label: 'C', color: '#f90' },
        {
            minimumAccuracy: null,
            minimumScore: null,
            label: 'D',
            color: '#f55',
        },
    ].map(Object.freeze),
);

export function getGrade(accuracy, score) {
    return GRADES.find((grade) => {
        const accuracyMatches = grade.minimumAccuracy === null || accuracy >= grade.minimumAccuracy;
        const scoreMatches = grade.minimumScore === null || score >= grade.minimumScore;
        return accuracyMatches && scoreMatches;
    });
}

export function calculateAccuracy(correct, incorrect) {
    const total = correct + incorrect;
    return total > 0 ? Math.round((correct / total) * 100) : 0;
}
