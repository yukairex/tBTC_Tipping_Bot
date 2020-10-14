# tBTC Tip Bot

### zk-sync tBTC tipping bot made for Keep Network Discord, with MySQL as a DB.

This code is based off https://github.com/kayabaNerve/tip-bot

To install the bot:

- Move `erc20Settings.json` to `settings.json`.
- Edit the `settings.json` accordingly.
- Install MySQL.
  - Create a database.
  - Create a table with `id INT(11), name VARCHAR(64), address VARCHAR(64), balance VARCHAR(64), notify tinyint(1), txid VARCHAR(64)`.
  - Edit the `settings.json` file's `mysql` var to have:
    - `db` set to the name of the database you made for the bot.
    - `tips` set to the name of the table you made for the bot.
    - `user` set to the name of a MySQL user with access to the DB.
    - `pass` set to the password of that MySQL user.
- Create a Discord Bot User.
  - Go to https://discordapp.com/developers/applications/me.
  - Click `New App`.
  - Enter a name, and optionally, upload an icon.
  - Click `Create a Bot User`.
  - Grab the `Client ID` from the top, and go to this link: https://discordapp.com/oauth2/authorize?client_id=!!CLIENT_ID!!&scope=bot&permissions=68672, after replacing !!CLIENT_ID!! with the bot's client ID. This will allow you to add the bot to a server with the proper permissions of Read Messages/Send Messages/Add Reactions (the last one is only necessary if you use giveaways).
  - Edit the `settings.json` file's `discord` var to include:
    - `token` set to the bot user token. This is not the client user.
    - `user` set to the value gotten by right-clicking the bot on your server and clicking `Copy ID`. This requires `Developer Mode` to be enabled on your
- Install NodeJS dependencies via `npm i`.
  - `discord.js` will print several warnings about requiring a peer but none was installed. These are normal, and refer to optional packages for connecting to voice channels, something we don't do.
