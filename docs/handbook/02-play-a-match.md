# 2. Play a Match

This page tells you how to use AptiQuiz. The live site is [aptiquiz.codesuke.in](https://aptiquiz.codesuke.in).

## As a Host

### Before your first Room

1. Open the site and sign up with email and a password, or with Google.
2. Open the link in the verification email.
3. Go to `/college`. Search for your college and select it as your Home College.

Your Rooms belong to your Home College. You cannot host without one.

### Write a Question Set

1. Go to `/question-sets`.
2. Create a set and give it a title.
3. Add a Question. Write the text and 2 to 6 options.
4. Select the correct option.
5. Write a topic. The field suggests Quantitative, Logical, Verbal, and Data Interpretation. You can also write your own topic.
6. Select a difficulty: Easy, Medium, or Hard.
7. Optional: add an image URL or a data table. Write the table as one line for each row, with commas between cells. The first line is the header.
8. Repeat steps 3 to 7 for each Question.

You can edit a Question at any time. You can also change the order of the Questions. You can use the same set for many Rooms.

> **Note:** A Room keeps its own copy of the Questions. If you edit a set, a Room that already exists does not change.

### Create a Room and start

1. Go to `/host`.
2. Select one of your sets or a starter set.
3. Click **Create Room**. The Host Lobby opens.
4. Give the Join Code to the players. You can also show the QR code, or use **Copy** and **Share** to send the link.
5. Look at the roster. It shows each player when they join.
6. Click **Start match** when all players are in.

After the start, the server runs the full Match. You do not need to click again.

## As a Player

1. Go to `/join`, or scan the QR code from the Host.
2. Type the six-character Join Code.
3. Type a display name.
4. Wait in the Lobby. Read the scoring rules on the screen.
5. When the Question shows, select one option. You cannot change your answer.
6. Look at the reveal. It shows the correct answer, your points, and the Leaderboard.
7. At the end, look at your results: accuracy, average speed, and strengths by topic.

You do not need an account to play. If you sign in and verify your email, your score also counts in the [College League](08-college-league.md).

> **Note:** If you refresh the page or lose the connection, open the same page again. AptiQuiz brings you back with your score. See [Reconnection](06-reconnection.md).

## Look at the League

Go to `/league`. It shows the top 10 players and the top 10 colleges for this week.

## Play against bots

You can fill your own Room with bots. This is useful for practice or for a demonstration on a projector.

1. Create a Room in the browser. Do not start it yet.
2. In a terminal, go to the `Apti-App/` folder.
3. Run this command with your Join Code:

   ```bash
   SIMULATOR_JOIN_CODE=ABC234 SIMULATED_PLAYERS=20 pnpm simulate:bots
   ```

4. Wait for the message `[bots] 20 bots joined`.
5. Start the Match in the browser.

Each bot selects a random option after a random time. Some bots skip some Questions.
