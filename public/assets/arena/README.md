# Arena rank medals

The student Arena leaderboard ([app/student/arena/components/LeaderboardTab.tsx](../../../app/student/arena/components/LeaderboardTab.tsx))
and the post-quiz result popup ([app/student/arena/components/QuizResultModal.tsx](../../../app/student/arena/components/QuizResultModal.tsx))
reference three medal images for ranks 1, 2 and 3.

Drop the following PNG files into this folder (exact names):

| File          | Medal                |
| ------------- | -------------------- |
| `rank-1.png`  | Gold rosette ("1")   |
| `rank-2.png`  | Silver medal ("2")   |
| `rank-3.png`  | Bronze rosette ("3") |

They are served as `/assets/arena/rank-1.png` etc. Recommended size: square, ~96×96px or larger
(they are rendered small via `next/image`). Until the files are present, the rank badges simply
won't show — the rest of the leaderboard still works.
