const http = require('http');
const fs = require('fs');
const querystring = require('querystring');

const LEADERBOARD_FILE = 'leaderboard.json';

function loadLeaderboard() {
    try {
        if (fs.existsSync(LEADERBOARD_FILE)) {
            const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.log('Error loading leaderboard:', e);
    }
    return [];
}

function saveLeaderboard(data) {
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('Error saving leaderboard:', e);
    }
}

const server = http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const params = querystring.parse(body);
                const data = JSON.parse(params.json);
                let leaderboardData = loadLeaderboard();
                const user = data.user;
                const friends = data.friends || [];

                // Add/Update user
                let userEntry = leaderboardData.find(entry => entry.xuid === user.xuid);
                if (!userEntry) {
                    userEntry = {
                        name: user.name,
                        rating: user.rating,
                        xuid: user.xuid
                    };
                    leaderboardData.push(userEntry);
                } else {
                    userEntry.name = user.name;
                    userEntry.rating = user.rating;
                }

                // Add friends with random ratings if not like present yk
                friends.forEach(friend => {
                    let friendEntry = leaderboardData.find(entry => entry.xuid === friend.xuid);
                    if (!friendEntry) {
                        friendEntry = {
                            name: friend.name,
                            rating: Math.floor(Math.random() * (30000 - 1000)) + 1000,
                            xuid: friend.xuid
                        };
                        leaderboardData.push(friendEntry);
                    }
                });
              
                leaderboardData.sort((a, b) => b.rating - a.rating);

                leaderboardData.forEach((entry, index) => {
                    entry.place = index + 1;
                });

                saveLeaderboard(leaderboardData);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(leaderboardData, null, 2));
            } catch (e) {
                res.writeHead(400);
                res.end('Invalid JSON');
            }
        });
    } else if (req.url.startsWith('/position') && req.method === 'GET') {
        const url = new URL(req.url, 'http://127.0.0.1:8080');
        const xuid = url.searchParams.get('xuid');
        let leaderboardData = loadLeaderboard();
        leaderboardData.sort((a, b) => b.rating - a.rating);
        leaderboardData.forEach((entry, index) => {
            entry.place = index + 1;
        });
        const userEntry = leaderboardData.find(entry => entry.xuid === xuid);
        if (userEntry) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ place: userEntry.place, rating: userEntry.rating }, null, 2));
        } else {
            res.writeHead(404);
            res.end('User not found');
        }
    } else if (req.url === '/' && req.method === 'GET') {
        let leaderboardData = loadLeaderboard();
        leaderboardData.sort((a, b) => b.rating - a.rating);
        leaderboardData.forEach((entry, index) => {
            entry.place = index + 1;
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(leaderboardData, null, 2));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(8080, '127.0.0.1', () => {
    console.log('Leaderboard server running at http://127.0.0.1:8080/');
});
