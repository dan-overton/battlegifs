var Games = new Mongo.Collection("Games");
var Gifs = new Mongo.Collection("Gifs");
var CountDown = new Mongo.Collection("CountDown");
var Chats = new Mongo.Collection("Chats")

if (Meteor.isServer) {

  Meteor.startup(function() {

    return Meteor.methods({
      init: function() {
          Chats.remove({});
		Games.insert({Created: new Date(), Turn:{isPlayerOne: true, round:1}, Players:[]})
      },

      changeTurn: function() {
        var turn = Games.findOne({},{sort:{Created:-1}}).Turn;
		var id = Games.findOne({},{sort:{Created:-1}})._id;
		Games.update(id, {$set:{"Turn.isPlayerOne": !turn.isPlayerOne}});
      },

      openVoting: function() {
		var game = Games.findOne({},{sort:{Created:-1}});
		var id = game._id;
		Games.update(id, {$set:{"Turn.isVotingOpen": true}});

          var count = 12;
          CountDown.insert({counter:count});

        for(var i = 1; i < 12; i++){
            Meteor.setTimeout(function(){
                CountDown.update({}, {$set:{counter: (--count)}});
            }, i * 1000);
        }

        Meteor.setTimeout(function(){
          Games.update(id, {$set: {"Turn.isVotingOpen": false, "Turn.isPlayerOne": true, "Turn.round": game.Turn.round + 1}});
            CountDown.remove({});
        },12000);
      },

      voteOne: function() {
        var currentGame = Games.findOne({},{sort:{Created:-1}});
        Games.update({_id: currentGame._id},
            { $inc: { "Players.0.votes": 1} }
        );

        Gifs.update({game: currentGame._id, round: currentGame.Turn.round, player: 0},
            {$inc: { votes: 1}});
      },

      voteTwo: function() {
        var currentGame = Games.findOne({},{sort:{Created:-1}});
        Games.update({_id: currentGame._id},
            { $inc: { "Players.1.votes": 1} }
        );

        Gifs.update({game: currentGame._id, round: currentGame.Turn.round, player: 1},
            {$inc: { votes: 1}});
      }
    });
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Template.body.helpers({
    players: function () {
      return Games.findOne({},{sort:{Created:-1}}).Players;
    },
    currentGifs: function() {
		var game = Games.findOne({},{sort:{Created:-1}});
		if(game === undefined) return [];

		return Gifs.find({game: game._id, round: game.Turn.round});

    },
	backgroundGifs: function() {
      var gifs = Gifs.find({}, {sort:{Created:-1}, limit:25});

      if(!gifs) {
        return [];
      }

      var hrefs = [];
      gifs.forEach(function(fig) {
        hrefs.push(fig);
      });

      return hrefs;
	},
      countdown: function() {
          if(CountDown.findOne({}) === undefined) return null;
        return CountDown.findOne({}).counter;
    },
      aPlayer: function() {
          return Session.get("playerOne") || Session.get("playerTwo");
      },
      chats: function(){
          var c = [];

          Chats.find({}, {sort:{created:-1}, limit:3}).forEach(function(chat){
              c.push(chat);
          });

          return c.reverse();
      },

      notAPlayer: function() {
        return !(Session.get("playerOne") || Session.get("playerTwo"));
      },

      twoPlayers: function() {
        return Games.findOne({},{sort:{Created:-1}}) !== undefined && Games.findOne({},{sort:{Created:-1}}).Players.length == 2;
      },

      nickname: function(){
          return Session.get("nick");
      }
  });

  Template.body.events({
    "click #clearPlayers": function () {
      Meteor.call('init');
    },
      "submit .nick-form": function (event) {
          // Set the checked property to the opposite of its current value
          event.preventDefault();
          console.log("hello!");
          Session.set("nick", event.target.text.value );
          Session.set("chatImageUrl", 'watcher.jpg' );
      },
      "submit .chat-form": function (event) {
          // Set the checked property to the opposite of its current value
          event.preventDefault();
          console.log("hello!");
          var nick = Session.get("nick");
          Chats.insert({nickname: Session.get("nick"), imageUrl: Session.get("chatImageUrl"), text:event.target.text.value, created: new Date()});
          event.target.text.value = "";
      }
  });

  Template.joinForm.helpers({
    roundResults: function() {
      var game = Games.findOne({},{sort:{Created:-1}});
      console.log("roundresults");
      var gifs = Gifs.find({game: game._id});

      var rounds = [];
      for(var i = 0; i < 3; i++) {
        rounds.push({round: i+1});
      }
      console.log(rounds.length);

      gifs.forEach(function(gif){
        console.log(gif.href + " - " + gif.votes + - gif.round);
        if(gif.player == 0)
        {
          rounds[gif.round-1].playerOne = {href: gif.href, votes: gif.votes};
        }
        else
        {
          rounds[gif.round-1].playerTwo = {href: gif.href, votes: gif.votes};
        }
      });

      return rounds;
    },

    gameOver: function() {
	if(Games.findOne({},{sort:{Created:-1}}) === undefined) return false;

      return Games.findOne({},{sort:{Created:-1}}).Turn.round == 4; //3 rounds
    },

      countdown: function() {
          if(CountDown.findOne({}) === undefined) return null;
          return CountDown.findOne({}).counter;
      },

    noPlayers: function() {
      if(Games.findOne({},{sort:{Created:-1}}) === undefined || Games.findOne({},{sort:{Created:-1}}).Players.length == 0)
      {
        Session.set("playerOne", false);
        Session.set("playerTwo", false);
        Session.set("voted", false);
        return true;
      }

      return false;
    },

    hasntVoted: function() {
      return Session.equals("voted", false);
    },

    onePlayer: function() {
		return Games.findOne({},{sort:{Created:-1}}) !== undefined && Games.findOne({},{sort:{Created:-1}}).Players.length == 1;
    },

    twoPlayers: function() {
      return Games.findOne({},{sort:{Created:-1}}) !== undefined && Games.findOne({},{sort:{Created:-1}}).Players.length == 2;
    },

    playerOne: function() {
      return Games.findOne({},{sort:{Created:-1}}).Players[0];
    },

    playerTwo: function() {
      return Games.findOne({},{sort:{Created:-1}}).Players[1];
    },

    imPlayerOne: function() {
      return Session.equals("playerOne", true);
    },

    imPlayerTwo: function() {
      return Session.equals("playerTwo", true);
    },

    notAPlayer: function() {
      return !(Session.get("playerOne") || Session.get("playerTwo"));
    },

    myTurn: function() {
      return ((Session.get("playerOne") &&  Games.findOne({},{sort:{Created:-1}}).Turn.isPlayerOne) ||
      (Session.get("playerTwo") &&  !Games.findOne({},{sort:{Created:-1}}).Turn.isPlayerOne));
    },

    currentRound: function() {
      return Games.findOne({},{sort:{Created:-1}}).Turn.round;
    },

    finalRound: function() {
      return Games.findOne({},{sort:{Created:-1}}).Turn.round === 3;
    },

    playerOneVotes: function() {
      return Games.findOne({},{sort:{Created:-1}}).Players[0].votes
    },

    playerTwoVotes: function() {
      return Games.findOne({},{sort:{Created:-1}}).Players[1].votes
    },

    progressBar: function() {
      var p1 = Games.findOne({},{sort:{Created:-1}}).Players[0];
      var p2 = Games.findOne({},{sort:{Created:-1}}).Players[1];

      var total = p1.votes + p2.votes;

      if (total === 0) {
        return 50;
      }

      return (p1.votes / total) * 100;
    },

    votingOpen: function() {
	var game = Games.findOne({},{sort:{Created:-1}});
      var open = game.Turn.isVotingOpen;

      if(!open)
      {
        Session.set("voted", false);
      }
      return open;
    },

    isDraw: function() {
      var p1 = Games.findOne({},{sort:{Created:-1}}).Players[0];
      var p2 = Games.findOne({},{sort:{Created:-1}}).Players[1];
      return p1.votes === p2.votes
    },

    winner: function() {
      var p1 = Games.findOne({},{sort:{Created:-1}}).Players[0];
      var p2 = Games.findOne({},{sort:{Created:-1}}).Players[1];

      if(p1.votes > p2.votes)
      {
        return p1;
      }

      if(p2.votes > p1.votes)
      {
        return p2;
      }

      return null;
    },
    nickname: function(){
      return Session.get("nick");
    }
  });

Template.chat.helpers({
  timeSinceThen: function(date) {
    var today = new Date();
    var diffMs = (today - date);
    return Math.round(((diffMs % 86400000) % 3600000) / 60000);
  }
});

  Template.joinForm.events({

    "click #newGame": function (event) {
      event.preventDefault();
      Meteor.call('init');
    },

    "click #playAsNicknameP1": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
      var id = Games.findOne({},{sort:{Created:-1}})._id;
      Games.update(id, {$push:{Players:{name: Session.get("nick"), votes: 0, imageUrl: 'player1.jpg' }}});
      Session.set("playerOne", true);
    },
    "click #playAsNicknameP2": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
      var id = Games.findOne({},{sort:{Created:-1}})._id;
      Games.update(id, {$push:{Players:{name: Session.get("nick"), votes: 0, imageUrl: 'player2.jpg' }}});
      Session.set("playerTwo", true);
    },
    "submit .player-one": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
      var id = Games.findOne({},{sort:{Created:-1}})._id;
      Games.update(id, {$push:{Players:{name: event.target.text.value, votes: 0, imageUrl: 'player1.jpg' }}});
      Session.set("nick", event.target.text.value);
      Session.set("playerOne", true);
      Session.set("nick", event.target.text.value );
      Session.set("chatImageUrl", 'player1.jpg' );
    },

    "submit .player-two": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
      var id = Games.findOne({},{sort:{Created:-1}})._id;
      Games.update(id, {$push:{Players:{name: event.target.text.value, votes: 0, imageUrl: 'player2.jpg'}}});
      Session.set("playerTwo", true);
      Session.set("nick", event.target.text.value );
      Session.set("chatImageUrl", 'player2.jpg' );
    },

    "submit .add-gif": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
		var url = event.target.text.value;
		var gifRe = /^http[s]?:\/\/.+\.gif$|^http:\/\/[^.]*\.?gfycat\.com\/.*$|^https:\/\/i\.imgur\.com\/[^.]+\.gifv$/ig;
		if(url === "") return;
		if(url.match(gifRe).length === 0) return;

      var currentTurn = Games.findOne({},{sort:{Created:-1}}).Turn;
      var currentPlayer = currentTurn.isPlayerOne ? 0 : 1;
      var playerName = Games.findOne({},{sort:{Created:-1}}).Players[currentPlayer].name;
		var id = Games.findOne({},{sort:{Created:-1}})._id;

      Gifs.insert({game: id, href: url, round: currentTurn.round, Created: new Date(), user: playerName, player: currentPlayer, votes: 0});
      if(currentPlayer == 1)
      {
        Meteor.call('openVoting');
        Session.set("voted", false);
      }

      Meteor.call('changeTurn');
    },

    "click #voteOne": function (event) {
      event.preventDefault();
      Session.set("voted",true);
      Meteor.call('voteOne');
    },

    "click #voteTwo": function (event) {
      event.preventDefault();
      Session.set("voted",true);
      Meteor.call('voteTwo');
    }
  });

  Template.gif.helpers({
    gifId: function()
    {
      return this.round + "gif" + this.user;
    },

    imgurGifV: function() {
      if(this.href.substring(this.href.length-5) == ".gifv")
      {
        return true;
      }
      return false;
    },

    imgurGifVRoot: function() {
      return this.href.substring(0, this.href.length-5);
    },

    gfycat: function () {
      if (this.href.indexOf("gfycat") !== -1) {

        var last = this.href.lastIndexOf("/");

        if(last == this.href.length)
        {
          this.href = this.href.substring(0, this.href.length - 1);
          last = this.href.lastIndexOf("/");
        }
        this.gfylink = this.href.substring(last+1);

        return true;
      }

      return false;
    },

    finish: function() {
      var gfy = document.getElementById(this.round + "gif" + this.user);
		if(gfy === null) return;
      var a = new gfyObject(gfy);
      a.init();
    }
  });

    Template.bg.helpers({
        gifId: function()
        {
            return this.round + "gif" + this.user;
        },

        imgurGifV: function() {
            if(this.href.substring(this.href.length-5) == ".gifv")
            {
                return true;
            }
            return false;
        },

        imgurGifVRoot: function() {
            return this.href.substring(0, this.href.length-5);
        },

        gfycat: function () {
            if (this.href.indexOf("gfycat") !== -1) {

                var last = this.href.lastIndexOf("/");

                if(last == this.href.length)
                {
                    this.href = this.href.substring(0, this.href.length - 1);
                    last = this.href.lastIndexOf("/");
                }
                this.gfylink = this.href.substring(last+1);

                return true;
            }

            return false;
        },

        finish: function() {
            var gfy = document.getElementById("bg" + this.round + "gif" + this.user);
            if(gfy === null) return;
            var a = new gfyObject(gfy);
            a.init();
        }
    });

  Template.roundrow.helpers({
    round: function()
    {
      return this.round;
    },

    player1gif: function()
    {
      return this.playerOne.href;
    },

    player2gif: function()
    {
      return this.playerTwo.href;
    },

    player1text: function()
    {
      if(this.playerOne.href.length > 25)
      {
        return this.playerOne.href.substring(0,22) + "...";
      }
      return this.playerOne.href;
    },

    player2text: function()
    {
      if(this.playerTwo.href.length > 25)
      {
        return this.playerTwo.href.substring(0,22) + "...";
      }
      return this.playerTwo.href;
    },

    player1votes: function()
    {
      return this.playerOne.votes;
    },

    player2votes: function()
    {
      return this.playerTwo.votes;
    }
  })
}
