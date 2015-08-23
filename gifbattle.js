Turn = new Mongo.Collection("turns");
Gifs = new Mongo.Collection("gifs");
Players = new Mongo.Collection("players");

if (Meteor.isServer) {

  Meteor.startup(function() {

    return Meteor.methods({
      init: function() {
        Players.remove({});
        Gifs.remove({});
        Turn.remove({});
        Turn.insert({isPlayerOne: true, round:1});
      },

      changeTurn: function() {
        var turn = Turn.findOne({});
        Turn.update({}, {$set: {isPlayerOne: !turn.isPlayerOne}});
      },

      openVoting: function() {
        Turn.update({}, {$set: {isVotingOpen: true}});

        Meteor.setTimeout(function(){
          Turn.update({}, {$set: {isVotingOpen: false, isPlayerOne: true}, $inc: { round: 1}});

        },15000);
      },

      voteOne: function() {
        Players.update(
            { number: 1 },
            { $inc: { votes: 1} }
        )
      },

      voteTwo: function() {
        Players.update(
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
      return Players.find({});
    },
    currentGifs: function() {
      var currentRound = Turn.findOne({}).round;
      return Gifs.find({round: currentRound});
    }
  });

  Template.body.events({
    "click #clearPlayers": function () {
      Meteor.call('init');
    }
  });

  Template.joinForm.helpers({
    gameOver: function() {
      return Turn.findOne({}).round == 4; //3 rounds
    },

    noPlayers: function() {
      if(Players.find({}).count() == 0)
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
      return Players.find({}).count() == 1;
    },

    twoPlayers: function() {
      return Players.find({}).count() == 2;
    },

    playerOne: function() {
      return Players.findOne({number: 1}).name;
    },

    playerTwo: function() {
      return Players.findOne({number: 2}).name;
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
      return ((Session.get("playerOne") &&  Turn.findOne({}).isPlayerOne) ||
      (Session.get("playerTwo") &&  !Turn.findOne({}).isPlayerOne));
    },

    currentRound: function() {
      return Turn.findOne({}).round;
    },

    playerOneVotes: function() {
      return Players.findOne({number: 1}).votes
    },

    playerTwoVotes: function() {
      return Players.findOne({number: 2}).votes
    },

    votingOpen: function() {
      var open = Turn.findOne({}).isVotingOpen;

      if(!open)
      {
        Session.set("voted", false);
      }
      return open;
    },

    winnerName: function() {
      var p1 = Players.findOne({number: 1});
      var p2 = Players.findOne({number: 2});

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
    "submit .player-one": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
      Players.insert({number: 1, name: event.target.text.value, votes: 0});
      Session.set("playerOne", true);
    },

    "submit .player-two": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
      Players.insert({number: 2, name: event.target.text.value, votes: 0});
      Session.set("playerTwo", true);
    },

    "submit .add-gif": function (event) {
      // Set the checked property to the opposite of its current value
      event.preventDefault();
		var url = event.target.text.value;
		var gifRe = /^http[s]?:\/\/.+\.gif$|http:\/\/[^.]+.gfycat.com\/.*/g;
		if(url === "") return;
		//if(url.match(gifRe).length === 0) return;

      var currentTurn = Turn.findOne({});
      var currentPlayer = currentTurn.isPlayerOne ? 1 : 2;
      var playerName = Players.findOne({number: currentPlayer}).name;
      Gifs.insert({user: playerName, href: url, round: currentTurn.round});
      if(currentPlayer == 2)
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
      var a = new gfyObject(gfy);
      a.init();
    }
  });
}
