const socket = io();

let currentRoomCode = '';
let isCreator = false;
let hasVoted = false;
let playerName = '';

document.getElementById('createRoomButton').addEventListener('click', () => {
    console.log('Create room button clicked');
    playerName = document.getElementById('playerNameInput').value.trim();
    if (playerName) {
        socket.emit('createRoom', playerName, (response) => {
            console.log('createRoom response:', response);
            if (response && response.roomCode) {
                handleRoomJoin(response.roomCode, response.players, true);
            } else {
                alert('Failed to create room');
            }
        });
    } else {
        alert('Please enter your name');
    }
});

document.getElementById('joinRoomButton').addEventListener('click', () => {
    document.getElementById('roomCodeInput').style.display = 'block';
});

document.getElementById('roomCodeInput').addEventListener('change', () => {
    playerName = document.getElementById('playerNameInput').value.trim();
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if (playerName && roomCode) {
        socket.emit('joinRoom', { roomCode, playerName }, (response) => {
            if (response.success) {
                handleRoomJoin(roomCode, response.players, false);
            } else {
                alert(response.message);
            }
        });
    } else {
        alert('Please enter your name and room code');
    }
});

function handleRoomJoin(roomCode, players, creator) {
    console.log('handleRoomJoin called:', { roomCode, players, creator });
    currentRoomCode = roomCode;
    isCreator = creator;
    document.getElementById('nameContainer').style.display = 'none';
    document.getElementById('waitingContainer').style.display = 'block';
    
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    console.log('roomCodeDisplay before:', roomCodeDisplay.innerHTML);
    
    roomCodeDisplay.innerHTML = `Room Code: <span id="roomCodeText">${roomCode}</span><button id="copyRoomCodeButton" aria-label="Copy room code"><i class="fas fa-copy"></i></button>`;
    
    console.log('roomCodeDisplay after:', roomCodeDisplay.innerHTML);
    
    updatePlayersList(players);
    document.getElementById('startGameButton').style.display = creator ? 'block' : 'none';

    const copyButton = document.getElementById('copyRoomCodeButton');
    if (copyButton) {
        console.log('Copy button found, adding event listener');
        copyButton.addEventListener('click', copyRoomCode);
    } else {
        console.error('Copy button not found');
    }
}

function copyRoomCode() {
    console.log('copyRoomCode called');
    const roomCodeText = document.getElementById('roomCodeText').textContent;
    navigator.clipboard.writeText(roomCodeText).then(() => {
        alert('Room code copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy room code: ', err);
    });
}

function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        playersList.appendChild(li);
    });
}

document.getElementById('startGameButton').addEventListener('click', () => {
    socket.emit('startGame', currentRoomCode);
});

socket.on('assignWords', (word) => {
    document.getElementById('waitingContainer').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    document.getElementById('wordDisplay').textContent = `Your word is: ${word}`;
});

document.getElementById('sendButton').addEventListener('click', () => {
    const sentence = document.getElementById('sentenceInput').value.trim();
    if (sentence) {
        socket.emit('submitSentence', { roomCode: currentRoomCode, sentence });
        document.getElementById('sentenceInput').value = '';
    }
});

socket.on('receiveSentence', ({ sentence, playerName }) => {
    const messages = document.getElementById('messages');
    const li = document.createElement('li');
    li.textContent = `${playerName}: ${sentence}`;
    messages.appendChild(li);
});

document.getElementById('callVoteButton').addEventListener('click', () => {
    socket.emit('callVote', currentRoomCode);
});

socket.on('startVote', (playerNames) => {
    document.getElementById('voteContainer').style.display = 'block';
    const playerListForVote = document.getElementById('playerListForVote');
    playerListForVote.innerHTML = '';
    hasVoted = false;
    playerNames.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        li.addEventListener('click', () => {
            if (!hasVoted) {
                if (name !== playerName) {
                    socket.emit('vote', { roomCode: currentRoomCode, votedPlayerName: name });
                    hasVoted = true;
                    playerListForVote.style.pointerEvents = 'none';
                    li.style.fontWeight = 'bold';
                } else {
                    alert('You cannot vote for yourself.');
                }
            } else {
                alert('You have already voted in this round.');
            }
        });
        playerListForVote.appendChild(li);
    });
});

socket.on('updateVotes', (votes) => {
    const votesDisplay = document.getElementById('votesDisplay');
    votesDisplay.innerHTML = '';
    for (const [playerName, voteCount] of Object.entries(votes)) {
        const li = document.createElement('li');
        li.textContent = `${playerName}: ${voteCount} vote(s)`;
        votesDisplay.appendChild(li);
    }
});

socket.on('updateRoom', (players) => {
    updatePlayersList(players);
});

socket.on('voteResult', ({ votedOut, votes, imposter, isImposterCaught }) => {
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = `
        <h2>Voting Results</h2>
        <p>Player voted out: ${votedOut}</p>
        <p>The imposter was: ${imposter}</p>
        <p>${isImposterCaught ? 'The imposter was caught!' : 'The imposter escaped!'}</p>
        <h3>Vote Distribution:</h3>
        <ul>
            ${Object.entries(votes).map(([player, voteCount]) => 
                `<li>${player}: ${voteCount} vote(s)</li>`
            ).join('')}
        </ul>
        <button id="nextRoundButton">Next Round</button>
    `;
    
    document.getElementById('voteContainer').style.display = 'none';
    document.getElementById('votesDisplay').style.display = 'none';
    
    document.getElementById('nextRoundButton').addEventListener('click', () => {
        resultContainer.style.display = 'none';
        hasVoted = false;
        // Here you can add logic to start the next round or end the game
    });
});