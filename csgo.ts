import axios from "axios";
import { writeFileSync } from "fs";

let FACEIT_API = "https://open.faceit.com/data/v4";
let FACEIT_PLAYERS = FACEIT_API + "/players/";

function shuffleArray<T>(inArray: T[]): T[] {
	const outArray = [...inArray];
	for (let i = outArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[outArray[i], outArray[j]] = [outArray[j], outArray[i]];
	}

	return outArray;
}

async function get(uri: string) {
	const result = await axios.get(uri, {
		headers: {
			Authorization: "Bearer 91479b42-47fc-47ce-9a6f-f613b4013b75",
		},
	});
	return result.data;
}

function getPlayerInformation(playerId: string) {
	return get(FACEIT_PLAYERS + playerId);
}

function getPlayerCsgoStats(playerId: string) {
	return get(FACEIT_PLAYERS + playerId + "/stats/csgo");
}

interface Player {
	id: string;
	elo: number;
	matches: number;
}

function getPlayer(playerId: string) {
	return Promise.all([
		getPlayerCsgoStats(playerId),
		getPlayerInformation(playerId),
	]).then(([csgoData, playerData]) => {
		let friends = playerData.friends_ids;
		if (friends.length > 3) {
			friends = shuffleArray(friends).slice(0, 3);
		}

		return {
			matches: parseInt(csgoData.lifetime.Matches, 10),
			elo: parseInt(playerData.games.csgo.faceit_elo, 10),
			friends: friends as string[],
		};
	});
}

const MAX_PLAYERS = 10000;

const MAX_WORKERS = 8;
let semaphore = 0;

getPlayers().then(() => console.log("Done!"));

async function getPlayers() {
	const players: Player[] = [];
	const queue = ["12efeb8c-3de1-4aeb-a37e-ab843b78d8c4"];
	let count = 0;
	let errorCount = 0;
	while (count < MAX_PLAYERS) {
		if (errorCount > 5) {
			break;
		}

		if (semaphore >= MAX_WORKERS || queue.length === 0) {
			await new Promise((resolve) => {
				setTimeout(() => resolve(), 100);
			});
			continue;
		}

		const semaphoreId = ++semaphore;
		const currentId = count;
		const currentPlayer = queue.shift();
		if (!currentPlayer) {
			throw new Error(
				"This should not happen since we check queue length before"
			);
		}
		console.log("[" + currentId + "]", semaphoreId, currentPlayer);
		getPlayer(currentPlayer)
			.then(({ matches, elo, friends }) => {
				queue.push(...friends);
				players.push({
					id: currentPlayer,
					matches,
					elo,
				});
				count++;
				semaphore--;
			})
			.catch((e) => {
				if (!e.message.includes("404")) {
					errorCount++;
				}
				writeFileSync("csgo.json", JSON.stringify({ players, queue }));
				console.log(
					"[" + currentId + "]",
					semaphoreId,
					currentPlayer,
					e.message
				);
				semaphore--;
			});
	}
	writeFileSync("csgo.json", JSON.stringify({ players, queue }));
}
