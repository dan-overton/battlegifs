var Games = new Mongo.Collection("Games");
var Gifs = new Mongo.Collection("Gifs");

if (Meteor.isServer) {

  Meteor.startup(function() {

    return Meteor.methods({
      init: function() {
		//Games.remove({});
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

        Meteor.setTimeout(function(){
          Games.update(id, {$set: {"Turn.isVotingOpen": false, "Turn.isPlayerOne": true, "Turn.round": game.Turn.round + 1}});

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
      var game = Games.findOne({},{sort:{Created:-1}});
      if(game === undefined) return [];

      var gifs = Gifs.find({game: game._id});

      if(!gifs) {
        return []
      }
      var hrefs = [];
      gifs.forEach(function(fig) {
        hrefs.push(fig.href);
      });

      return hrefs;
	}
  });

  Template.body.events({
    "click #clearPlayers": function () {
      Meteor.call('init');
    }
  });

  Template.joinForm.helpers({
    gameOver: function() {
	if(Games.findOne({},{sort:{Created:-1}}) === undefined) return false;

      return Games.findOne({},{sort:{Created:-1}}).Turn.round == 4; //3 rounds
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
      return Games.findOne({},{sort:{Created:-1}}).Players[0].name;
    },

    playerTwo: function() {
      return Games.findOne({},{sort:{Created:-1}}).Players[1].name;
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
    }
  });


  Template.joinForm.events({

    "click #newGame": function (event) {
      event.preventDefault();
      Meteor.call('init');
    },

    "submit .player-one": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
	var id = Games.findOne({},{sort:{Created:-1}})._id;
      Games.update(id, {$push:{Players:{name: event.target.text.value, votes: 0}}});
      Session.set("playerOne", true);
    },

    "submit .player-two": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
		var id = Games.findOne({},{sort:{Created:-1}})._id;
		Games.update(id, {$push:{Players:{name: event.target.text.value, votes: 0}}});
      Session.set("playerTwo", true);
    },

    "submit .add-gif": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
		var url = event.target.text.value;
		var gifRe = /^http[s]?:\/\/.+\.gif$|http:\/\/[^.]+.gfycat.com\/.*/g;
		if(url === "") return;
		//if(url.match(gifRe).length === 0) return;

      var currentTurn = Games.findOne({},{sort:{Created:-1}}).Turn;
      var currentPlayer = currentTurn.isPlayerOne ? 0 : 1;
      var playerName = Games.findOne({},{sort:{Created:-1}}).Players[currentPlayer].name;
		var id = Games.findOne({},{sort:{Created:-1}})._id;


      Games.update(id, {$push:{Gifs:{user: playerName, href: url, round: currentTurn.round}}});

      Gifs.insert({game: Games.findOne({},{sort:{Created:-1}})._id, href: url, round: currentTurn.round, user: playerName, player: currentPlayer, votes: 0});      if(currentPlayer == 1)
      {
        Meteor.call('openVoting');
        Session.Set("voted", false);
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
}
