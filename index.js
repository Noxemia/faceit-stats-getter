const express = require("express");

const rp = require("request-promise")

console.log("lmao")

const app = express();

const port = 3000;

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

app.get('/', (req, res) => rootRoute(res))

var options = {
    uri: 'https://open.faceit.com/data/v4/players?nickname=Noxcore',
    headers: {
        'User-Agent': 'Request-Promise',
        'Authorization': 'Bearer de4d6544-0262-499a-a41f-78ce5c1f91bb'
    },
    json: true // Automatically parses the JSON string in the response
};

function rootRoute(res){
     getData().then(data => {res.send("elo:" + data.games.csgo.faceit_elo)}).catch(e => console.log(e))
}

async function getData() { 
   return await rp(options);
 }


 var baseOptions = {
    uri: 'https://open.faceit.com/data/v4/players?nickname=Noxcore',
    headers: {
        'User-Agent': 'Request-Promise',
        'Authorization': 'Bearer de4d6544-0262-499a-a41f-78ce5c1f91bb'
    },
    json: true // Automatically parses the JSON string in the response
};



/// Add nickname att the end
let playerBaseUri = 'https://open.faceit.com/data/v4/players/';

let statsBaseUri = "https://open.faceit.com/data/v4/players/";
let statsEndUri = "/stats/csgo";



//// Used to get Elo and friends
var playerOptions = {
    headers: {
        'User-Agent': 'Request-Promise',
        'Authorization': 'Bearer de4d6544-0262-499a-a41f-78ce5c1f91bb'
    },
    json: true // Automatically parses the JSON string in the response
};

async function getPlayerData(options){
    return await rp(options);
}



calculateAvrageEloPerMatch().then(data => console.log(data)).catch((e) => console.log(e))
async function calculateAvrageEloPerMatch(){
    const amount = 10000;
    // For matches 50-99, 100-199, 200-299 and so on
    let statsArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let winsArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let usedPlayers = [];

    let playerId = "12efeb8c-3de1-4aeb-a37e-ab843b78d8c4" 

    for(let i = 0; i < amount; i++){
        console.log(i)
        usedPlayers.push(playerId);
        const data1 = await getPlayerData({uri: statsBaseUri+playerId+statsEndUri, ...playerOptions})
        const wins = data1.lifetime.Wins
        const data2 = await getPlayerData({uri: playerBaseUri+playerId, ...playerOptions})
        let elo = data2.games.csgo.faceit_elo

        elo = elo-1000
        if(elo < 0) elo = 0

        if(parseInt(wins) <50 ){
            /// People with less than 50 games just inflate the pool, they have not played enough to impact their intial elo
        }else if(parseInt(wins) < 100){
            statsArray[0] += elo;
            winsArray[0] += parseInt(wins)
        }else if(parseInt(wins) < 1000){
        statsArray[parseInt(wins[0])] += elo
        winsArray[parseInt(wins[0])] += parseInt(wins)
        }
        else{
            statsArray[10] += elo;
            winsArray[10] += parseInt(wins)
        }
        
        const friends = data2.friends_ids
        const backupId = "a4490e29-472e-4149-94e5-c6da998de3f0";
        let tryCounter = 0;

        while(true){
            let random = Math.floor(Math.random() * friends.length -1)
            let nextPlayer = friends[random];
            friends.splice(random)
            let random2 = Math.floor(Math.random() * friends.length -1)
            let backupPlayer = friends[random2];
            if(!usedPlayers.find(p => {p == nextPlayer} )){
                try {
                    await getPlayerData({uri: statsBaseUri+backupPlayer+statsEndUri, ...playerOptions})
                    backupId = nextPlayer;
                }catch(err){
                    console.log("Backup not a csgo player, backup not reassigned")
                }
                try {
                    await getPlayerData({uri: statsBaseUri+nextPlayer+statsEndUri, ...playerOptions})
                    playerId = nextPlayer;
                    break;
                }catch(err){
                    tryCounter++;
                    console.log("Not a csgo player, skipping")
                    if(tryCounter > 3){
                        playerId = backupId;
                        console.log("Backup used after 3 tries")
                        break;
                    }
                }
                
            }
        }

    }

    return {stats: statsArray, count: winsArray}
}



    
 
