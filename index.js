const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();

const token = 'token';

const bot = new TelegramBot(token, { polling: true });

const db = new sqlite3.Database("/home/zortul/Документы/telegBots/telegramModeratorBot/database.db", sqlite3.OPEN_READWRITE, (err) => {
    if (err) return console.error(err.message)
})


bot.onText('/start', async (msg) => {
    const chatId = msg.chat.id
    await bot.sendMessage(chatId, 'Бот працює!')    
})

bot.onText(/\/info/, async (msg) => {
    const chatId = msg.chat.id;
    const chatTitle = msg.chat.title
    await bot.sendMessage(chatId, `За допомогою цього бота ви можете купивати префікс\n\nСписок команд:\n/subscribe - добавитись до користувачів бота. Це обов'язково для отримання балів та купування префікусу.\n/balance - щоб дізнатись свою кількість балів.\n/give <тег користувача> <кількість балів> - дозволяє передати свої бали іншому користувачу.\n/pref <префікс> - придбати префікс. Також за допомогою цієї команди ви можете безкоштовно змінити префікс.\n/take <кількість балів> - Тільки для адмінів. Забрати бали користувача.\n\nСписок адмінів: <адміни>\n\nЯкщо у вас є запитання або ви знайшли помилку, пишіть до @VergilMotivationYamato`, {parse_mode: 'Markdown'})
}) 

bot.onText(/\/subscribe/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    let firstName = msg.from.first_name;
    let lastName = msg.from.last_name;
    const userName = lastName ? firstName + '' + lastName : firstName;
    const userTag = msg.from.username;
    console.log(userTag)
    console.log(userName)

    db.get("SELECT * FROM users WHERE user_id = ?", [userId], function(err, row) {
        if (err) {
            console.error('Error checking user existence:', err.message);
            return;
        }
        console.log('Row:', row); 

        if (row) {
            bot.sendMessage(chatId, `${userName} вже знаходиться в користувачах.`)
        } else {
            console.log('User not found.');
            db.run('INSERT INTO users (chat_id, user_id, username, balance) VALUES (?, ?, ?, ?)', [chatId, userId, userTag, 0], (err) => {
                if (err) {
                  console.error('Помилка при додаванні нового користувача до бази даних:', err);
                  return;
              }
              console.log('Row:', row); 
              bot.sendMessage(chatId, `${userName} добавлений.`)
              console.log('Новий користувач доданий до бази даних');
          });
        }
    });
})

bot.onText(/\/balance/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    let firstName = msg.from.first_name;
    let lastName = msg.from.last_name;
    const userName = lastName ? firstName + '' + lastName : firstName;

    try {
      db.get("SELECT username, balance FROM users WHERE user_id = ?", [userId], function(err, row) {
        if (err) {
            console.error('Error retrieving username:', err.message);
            return;
        }

        if (row) {
            const username = row.username;
            const rowBalance = row.balance;
            bot.sendMessage(chatId, `${userName} має: ${rowBalance} балів`)
        } else {
            console.log('User not found.');
            bot.sendMessage(chatId, 'Користувач не знайдений. \nНапишіть команду /subscribe щоб добавитись до користувачів бота.');
        }
    });
  } catch {
    console.error(error)
}
})

bot.onText(/\/give (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userToAdd = match[1].substring(1);
    const pointsToAdd = match[2];
    const userName = msg.from.last_name ? msg.from.first_name + ' ' + msg.from.last_name : msg.from.first_name;

    if (msg.from.username === userToAdd) {
        bot.sendMessage(chatId, `Неможливо передати бали собі.`)
    } else {
      try {
        db.run("UPDATE users SET balance = balance + ? WHERE username = ?", [pointsToAdd, userToAdd], function(err) {
            if (err) {
                console.error('Error adding balance:', err.message);
                return;
            } 
            bot.sendMessage(chatId, `${userName} отримав ${pointsToAdd} балів`)
        });
    } catch {
        console.error(error)
    }

}

})
bot.onText(/\/take (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userToTake =  match[1].substring(1);
    const pointsToTake = match[2];
    const userName = msg.from.last_name ? msg.from.first_name + ' ' + msg.from.last_name : msg.from.first_name;
    try {
        db.get("SELECT username, balance FROM users WHERE username = ?", [userToTake], function(err, row) {
        if (err) {
            console.error('Error retrieving username:', err.message);
            return;
        }
        if (row.balance - pointsToTake < 0) {
         db.run("UPDATE users SET balance = ? WHERE username = ?", [0, userToTake], function(err) {
            if (err) {
                console.error(err.message);
                return;
            } 
            bot.sendMessage(chatId, `${userName} лишився ${pointsToTake} балів`);
        });

     } else {
       db.run("UPDATE users SET balance = balance - ? WHERE username = ?", [pointsToTake, userToTake], function(err) {
        if (err) {
            console.error('Error subtracting balance:', err.message);
            return;
        } 
        bot.sendMessage(chatId, `${userName} лишився ${pointsToTake} балів`);
    });

   }
});
 } catch (error) {
    console.error(error);
}
}); 

bot.onText(/\/pref (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    let firstName = msg.from.first_name;
    let lastName = msg.from.last_name;
    const userName = lastName ? firstName + '' + lastName : firstName;
    const pref = match[1];
    const chatMember = await bot.getChatMember(chatId, userId);
    try {
        db.get("SELECT username, balance FROM users WHERE user_id = ?", [userId], function(err, row) {
            if (err) {
                console.log('ok')
                console.error(err.message);
                return;
            } 
            if (row.balance >= 50) {
                db.run("UPDATE users SET balance = balance - ? WHERE user_id = ?", [50, userId], function(err) {
                    if (err) {
                        console.error('Error subtracting balance:', err.message);
                        return;
                    } 
                    if (chatMember.status === 'member') {
                        bot.promoteChatMember(chatId, userId, {
                            can_change_info: false,
                            can_delete_messages: false,
                            can_invite_users: true,
                            can_pin_messages: false,
                            can_restrict_members: false,
                            can_promote_members: false
                        }) 
                        bot.setChatAdministratorCustomTitle(chatId,userId, pref)
                        bot.sendMessage(chatId, `${userName} купив/ла префікс: "${pref}"`)
                    } else if (chatMember.status === 'administrator' || chatMember.status === 'creator') {
                        bot.setChatAdministratorCustomTitle(chatId,userId, pref)
                        bot.sendMessage(chatId, `${userName} змінив/ла префікс на: "${pref}"`)
                    }

                });
            } else {
                bot.sendMessage(chatId, `Недостатньо ${50 - row.balance}`)
            }
        });
    } catch {
        console.log('Error')
    }
})
