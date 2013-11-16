var MLB = {
    Models: {},
    Views: {}
};

$(function() {

    MLB.Models.Players = Backbone.Model.extend({
        defaults: {
            team: 'all'
        }
    });

    MLB.Views.Map = Backbone.View.extend({
        initialize: function(model) {
            var self = this;

            self.criteria = '',
            self.params = '';

            self.map = L.map('map', {
                layers: MQ.mapLayer(),
                center: [ 38.347432, -98.200326 ],
                zoom: 4
            });

            self.get_players();

            model.on('change', self.get_players, self);
        },

        get_players: function() {
            var self = this;

            $.ajax({
                url: 'http://www.mapquestapi.com/search/v2/recordinfo?key=Fmjtd%7Cluubn9ubl9%2C2n%3Do5-902n1a',
                dataType: 'jsonp',
                data: {
                    hostedData: 'mqap.121123_mlb_batting|' + self.criteria + '|' + self.params,
                    maxMatches: 1000
                },
                success: function(data) {
                    var players = data.searchResults,
                        markers = [],
                        marker,
                        fields;

                    for (i=0; i<players.length; i++) {
                        fields = players[i].fields;

                        marker = L.marker([ fields.latitude, fields.longitude ]);
                        markers.push(marker);
                    }

                    self.lg = L.layerGroup(markers).addTo(self.map);
                }
            });
        }
    });

    MLB.Views.Menu = Backbone.View.extend({
        el: '.header',

        events: {
            'click .teams li' : 'change_team'
        },

        change_team: function(e) {
            var team = e.currentTarget.innerText;

            model.set({ team: team });
        }
    });

    var model = new MLB.Models.Players();

    new MLB.Views.Map(model);
    new MLB.Views.Menu();
});