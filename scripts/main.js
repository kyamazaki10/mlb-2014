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
        templates: {},

        initialize: function(model) {
            var self = this;

            self.map = L.map('map', {
                layers: MQ.mapLayer(),
                center: [ 31.928033, -12.318236 ],
                zoom: 2
            });

            self.get_players();

            model.on('change', self.get_query, self);
        },

        get_query: function() {
            var team = model.get('team'),
                criteria = (team === 'all') ? '' : 'team=?',
                params = (team === 'all') ? '' : team;

            this.group.clearLayers();
            this.get_players(criteria, params);
        },

        get_players: function(criteria, params) {
            var self = this,
                criteria = criteria || '',
                params = params || '';

            $.ajax({
                url: 'http://www.mapquestapi.com/search/v2/recordinfo?key=Fmjtd%7Cluubn9ubl9%2C2n%3Do5-902n1a',
                dataType: 'jsonp',
                data: {
                    hostedData: 'mqap.121123_mlb_batting|' + criteria + '|' + params,
                    maxMatches: 1000
                },
                success: function(data) {
                    var players = data.searchResults,
                        markers = [],
                        fields,
                        i;

                    for (i=0; i<players.length; i++) {
                        fields = self.format_fields(players[i].fields);
                        html = self.render_popup('marker', fields);

                        markers.push(self.get_marker(fields.latitude, fields.longitude, html));
                    }

                    self.group = L.featureGroup(markers).addTo(self.map);
                    self.map.fitBounds(self.group.getBounds());
                }
            });
        },

        get_marker: function(lat, lng, html) {
            var marker = L.marker([ lat, lng ]).bindPopup(html);

            marker.on('mouseover', function() {
                this.openPopup();
            });

            return marker;
        },

        render_popup: function(tmpl_name, tmpl_data) {
            var self = this;

            if (!self.templates[tmpl_name]) {
                var url = 'assets/templates/' + tmpl_name + '.html';

                $.ajax({
                    url: url,
                    async: false,
                    success: function(data) {
                        self.templates[tmpl_name] = _.template(data);
                    }
                });
            }

            return self.templates[tmpl_name](tmpl_data);
        },

        format_fields: function(fields) {
            var key;

            for (key in fields) {
                if (fields.hasOwnProperty(key)) {
                    switch(key) {
                        case 'ba' :
                        case 'obp' :
                        case 'slg' :
                            fields[key] = fields[key].toFixed(3).replace(/^[0]+/g, '');
                            break;
                        case 'salary' :
                            fields[key] = (fields[key] === null) ? 'N/A' : '$' + fields[key].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        default : break;
                    }
                }
            }

            fields.birthplace = fields.city + ', ';
            fields.birthplace += (fields.country === '') ? fields.state : fields.country;

            return fields;
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