const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');

const config = require('./config.json');
const username = config.username;
const password = config.password;
const sharedSecret = config.sharedSecret;
const identitySecret = config.identitySecret;
const ownerID = config.ownerID;
const handler = config.handler;
const appID = config.appID;
const contextID = config.contextID;


const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
	steam: client,
	community: community,
	language: 'en'
});

client.logOn({
	accountName: username,
	password: password,
	twoFactorCode: SteamTotp.generateAuthCode(sharedSecret)
});

client.on('loggedOn', () => {
	console.log('Logged into Steam.');
	client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade, 'Parowy [Bot]');
});

client.on('webSession', (sessionid, cookies) => {
	manager.setCookies(cookies);
	community.setCookies(cookies);

	community.startConfirmationChecker(10000, identitySecret);
});

client.on('friendMessage', (steamID, message) => {

	if (steamID.getSteamID64() === ownerID && message.startsWith(handler)) {

		const args = message.split(" ");
		const command = args[0].split(handler)[1];
		let quantity = args[1];
		switch (command) {

			case "help":
				client.chatMessage(steamID, "!help : displays this message\n" +
					"!put [int nrkeys] : deposit an amount of keys\n" +
					"!get [int nrkeys] : withdraw an amount of keys");
				break;

			case "put":
				if (!quantity) {
					client.chatMessage(steamID, "No amount detected, try again.");
				} else if (isNaN(parseInt(quantity))) {
					client.chatMessage(steamID, "Amount must be an int, try again.");
				} else {
					put(steamID, quantity);
				}
				break;

			case "get":
				if (!quantity) {
					client.chatMessage(steamID, "No amount detected, try again.");
				} else if (isNaN(parseInt(quantity))) {
					client.chatMessage(steamID, "Amount must be an int, try again.");
				} else {
					get(steamID, quantity);
				}
				break;
		}
	}
});


manager.on('newOffer', (offer) => {
	if (offer.partner.getSteamID64() === ownerID) {
		offer.accept((err, status) => {
			if (err) {
				console.log(err);
			} else {
				console.log(`Accepted offer. Status: ${status}.`);
			}
		});
	} else {
		offer.decline((err) => {
			if (err) {
				console.log(err);
			} else {
				console.log('Canceled offer from scammer.');
			}
		});
	}
});

function put(steamID, quantity) {
	const offer = manager.createOffer(ownerID);
	manager.loadUserInventory(ownerID, appID, contextID, true, (err, inv) => {
		if (err) {
			console.log(err);
		} else {
			const security = Math.random().toString(36).substr(2, 5).toUpperCase();
			let stock = quantity;
			for (let i = 0; i < inv.length; i++) {
				if (inv[i].name.includes("Key")) {
					offer.addTheirItem(inv[i]);
					if (--stock === 0) {
						client.chatMessage(steamID, `Success.\nRequested: ${quantity} keys\nSent: ${quantity} keys\nSecurity Code: ${security}`);
						break;
					}
				}
			}
			if (stock !== 0) {
				client.chatMessage(steamID, `Out of stock.\nRequested: ${quantity} keys\nSent: ${quantity-stock} keys\nSecurity Code: ${security}`);
			}
			offer.setMessage(`Parowy automated trade offer | Security Code: ${security}`);
			offer.send((err, status) => {
				if (err) {
					console.log(`Error sending offer: ${err}`);
				} else {
					console.log(`Sent offer. Requested: ${quantity} keys | Sent: ${quantity} keys | Status: ${status} | Security Code: ${security}`);
				}
			});
		}
	});
}


function get(steamID, quantity) {
	const offer = manager.createOffer(ownerID);
	manager.loadInventory(appID, contextID, true, (err, inv) => {
		if (err) {
			console.log(err);
		} else {
			const security = Math.random().toString(36).substr(2, 5).toUpperCase();
			let stock = quantity;
			for (let i = 0; i < inv.length; i++) {
				if (inv[i].name.includes("Key")) {
					offer.addMyItem(inv[i]);
					if (--stock === 0) {
						client.chatMessage(steamID, `Success.\nRequested: ${quantity} keys\nSent: ${quantity} keys\nSecurity Code: ${security}`);
						break;
					}
				}
			}
			if (stock !== 0) {
				client.chatMessage(steamID, `Out of stock.\nRequested: ${quantity} keys\nSent: ${quantity-stock} keys\nSecurity Code: ${security}`);
			}
			offer.setMessage(`Parowy automated trade offer | Security Code: ${security}`);
			offer.send((err, status) => {
				if (err) {
					console.log(`Error sending offer: ${err}`);
				} else {
					console.log(`Sent offer. Requested: ${quantity} keys | Sent: ${quantity} keys | Status: ${status} | Security Code: ${security}`);
				}
			});
		}
	});
}