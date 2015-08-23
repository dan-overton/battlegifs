Games = new Mongo.Collection("Games");

if (Meteor.isServer) {

  Meteor.startup(function() {

    return Meteor.methods({
      init: function() {
		Games.remove({});
		Games.insert({Turn:{isPlayerOne: true, round:1}, Players:[], Gifs:[]})
      },

      changeTurn: function() {
        var turn = Games.findOne({}).Turn;
		var id = Games.findOne({})._id;
		Games.update(id, {$set:{"Turn.isPlayerOne": !turn.isPlayerOne}});
      },

      openVoting: function() {
		var game = Games.findOne({});
		var id = game._id;
		Games.update(id, {$set:{"Turn.isVotingOpen": true}});

        Meteor.setTimeout(function(){
          Games.update(id, {$set: {"Turn.isVotingOpen": false, "Turn.isPlayerOne": true, "Turn.round": game.Turn.round + 1}});

        },15000);
      },

      voteOne: function() {
        Games.findOne({}).Players.update(
            { number: 1 },
            { $inc: { votes: 1} }
        )
      },

      voteTwo: function() {
        Games.findOne({}).Players.update(
            { number: 2 },
            { $inc: { votes: 1} }
        )
      }
    });
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Template.body.helpers({
    players: function () {
      return Games.findOne({}).Players;
    },
    currentGifs: function() {
		var game = Games.findOne({});
		if(game === undefined) return [];
      var currentRound = game.Turn.round;

		var gifs = [];
		for(i = 0; i < game.Gifs.length; i++){
			if(game.Gifs[i].round === game.Turn.round)
			{
				gifs.push(game.Gifs[i]);
			}
		}

      return gifs;
    }
  });

  Template.body.events({
    "click #clearPlayers": function () {
      Meteor.call('init');
    }
  });

  Template.joinForm.helpers({
    gameOver: function() {
	if(Games.findOne({}) === undefined) return false;
	
      return Games.findOne({}).Turn.round == 4; //3 rounds
    },

    noPlayers: function() {
      if(Games.findOne({}) === undefined || Games.findOne({}).Players.length == 0)
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
		return Games.findOne({}) !== undefined && Games.findOne({}).Players.length == 1;
    },

    twoPlayers: function() {
      return Games.findOne({}) !== undefined && Games.findOne({}).Players.length == 2;
    },

    playerOne: function() {
      return Games.findOne({}).Players[0].name;
    },

    playerTwo: function() {
      return Games.findOne({}).Players[1].name;
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
      return ((Session.get("playerOne") &&  Games.findOne({}).Turn.isPlayerOne) ||
      (Session.get("playerTwo") &&  !Games.findOne({}).Turn.isPlayerOne));
    },

    currentRound: function() {
      return Turn.findOne({}).round;
    },

    finalRound: function() {
      return currentRound() === 3;
    },

    playerOneVotes: function() {
      return Games.findOne({}).Players[0].votes
    },

    playerTwoVotes: function() {
      return Games.findOne({}).Players[1].votes
    },

    votingOpen: function() {
	var game = Games.findOne({});
      var open = game.Turn.isVotingOpen;

      if(!open)
      {
        Session.set("voted", false);
      }
      return open;
    },

    winnerName: function() {
      var p1 = Games.findOne({}).Players[0];
      var p2 = Games.findOne({}).Players[1];

      if(p1.votes > p2.votes)
      {
        return p1.name;
      }

      if(p2.votes > p1.votes)
      {
        return p2.name;
      }

      return "NO ONE";
    }
  });


  Template.joinForm.events({

    "click #newGame": function () {
      Meteor.call('init');
    },

    "submit .player-one": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
	var id = Games.findOne({})._id;
      Games.update(id, {$push:{Players:{name: event.target.text.value, votes: 0}}});
      Session.set("playerOne", true);
    },

    "submit .player-two": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
		var id = Games.findOne({})._id;
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

      var currentTurn = Games.findOne({}).Turn;
      var currentPlayer = currentTurn.isPlayerOne ? 0 : 1;
      var playerName = Games.findOne({}).Players[currentPlayer].name;
		var id = Games.findOne({})._id;
      Games.update(id, {$push:{Gifs:{user: playerName, href: url, round: currentTurn.round}}});
      if(currentPlayer == 1)
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
