var MLB = {
    Models: {},
    Views: {}
};

$(function() {

    MLB.Models.Players = Backbone.Model.extend({
        url: 'geojson/batting.geojson'
    });

    MLB.Views.Map = Backbone.View.extend({
        initialize: function(model) {
            var self = this;

            self.map = L.map('map', {
                layers: MQ.mapLayer(),
                center: [ 38.347432, -98.200326 ],
                zoom: 4
            });

            self.update();

            model.on('change', self.update, self);
        },

        update: function() {
            var features = this.attributes.features,
                latlng,
                marker,
                i;

            for (i=0; i<features.length; i++) {
                latlng = features[i].geometry.coordinates;

                marker = L.marker([ latlng[1], latlng[0] ]);
                this.map.addLayer(marker);
            }
        }
    });

    MLB.Views.Menu = Backbone.View.extend({
        el: '.header',

        events: {
            'click .teams li' : 'change_team'
        },

        initialize: function(model) {
            this.model = model;
        },

        change_team: function() {
            // TODO: update this. random model change to test event firing.
            var temp = this.model.attributes.features.pop();

            this.model.set(temp);
        }
    });

    var players = new MLB.Models.Players();

    players.fetch({
        success: function(model) {
            new MLB.Views.Map(model);
            new MLB.Views.Menu(model);
        }
    });
});