var MLB = {
    Models: {},
    Views: {}
};

$(function() {

    /**
     * MLB Players Model
     */
    MLB.Models.Players = Backbone.Model.extend({
        defaults: {
            //team: null,
            //salary: null
        }
    });

    /**
     * Map View
     */
    MLB.Views.Map = Backbone.View.extend({
        templates: {},

        /**
         * Initializing map view
         * @param {Backbone.Model} model Players model
         */
        initialize: function(model) {
            var self = this;

            // default world map view
            self.map = L.map('map', {
                layers: MQ.mapLayer(),
                center: [ 31.928033, -12.318236 ],
                zoom: 2
            });

            // send search request to retrieve players
            self.get_players();

            // get new search query when a change is triggered
            model.on('change', self.get_query, self);
        },

        /**
         * Getting the query needed for the search request
         */
        get_query: function() {
            var attributes = model.attributes,
                criteria = '',
                params = [],
                count = 0,
                operator,
                key;

            // set extraCriteria and parameter properties needed for request
            for (key in attributes) {
                if (attributes.hasOwnProperty(key)) {
                    operator = (key === 'salary') ? '>' : '=';

                    criteria += (count > 0) ? ' and ' : '';
                    criteria += key + operator + '?';

                    params.push(attributes[key]);

                    count++;
                }
            }

            // clear map and get new set of players to display
            this.group.clearLayers();
            this.get_players(criteria, params);
        },

        /**
         * Getting players to display on map
         * @param {String} criteria Search criteria
         * @param {Array} params Search parameters
         */
        get_players: function(criteria, params) {
            var self = this,
                criteria = criteria || '',
                params = params || '';

            // send ajax request to retrieve all players fitting the search criteria
            $.ajax({
                url: 'http://www.mapquestapi.com/search/v2/recordinfo?key=Fmjtd%7Cluubn9ubl9%2C2n%3Do5-902n1a',
                dataType: 'jsonp',
                data: {
                    hostedData: 'mqap.121123_mlb_batting|' + criteria + '|' + params,
                    maxMatches: 1000
                },
                success: function(data) {
                    var players = data.searchResults;

                    // show players on map or show error message
                    players ? self.show_players(players) : self.no_players();
                }
            });
        },

        /**
         * Show markers representing each player on map
         * @param {Object} players Players to display
         */
        show_players: function(players) {
            var self = this,
                html = '',
                markers = [],
                fields,
                i;

            // get html markup needed for the popups
            for (i=0; i<players.length; i++) {
                fields = self.format_fields(players[i].fields);
                html = self.render_popup('marker', fields);

                markers.push(self.get_marker(fields.latitude, fields.longitude, html));
            }

            // place markers into a Leaflet featureGroup and make it best fit
            self.group = L.featureGroup(markers).addTo(self.map);
            self.map.fitBounds(self.group.getBounds());
        },

        /**
         * Show error message when no players fit the search criteria
         */
        no_players: function() {
            $('.no-players').show().delay('3000').fadeOut();
        },

        /**
         * Getting markers and binding mouseover event to display stats on hover
         * @param {Number} lat Latitude of player hometown
         * @param {Number} lng Longitude of player hometown
         * @param {String} html HTML for popups
         * @return {Object} Leaflet marker
         */
        get_marker: function(lat, lng, html) {
            var marker = L.marker([ lat, lng ]).bindPopup(html);

            // open popup on mouseover
            marker.on('mouseover', function() {
                this.openPopup();
            });

            return marker;
        },

        /**
         * Rendering popup using Underscore.js templates
         * @param {String} tmpl_name Name of template to use
         * @param {Object} tmpl_data Player stats to display
         * @return {String} html for Leaflet popups
         */
        render_popup: function(tmpl_name, tmpl_data) {
            var self = this;

            // get appropriate template if we haven't already
            if (!self.templates[tmpl_name]) {
                var url = 'assets/templates/' + tmpl_name + '.html';

                // send ajax request to retrieve external template
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

        /**
         * Formatting fields for display
         * @param {Object} fields Player stats
         * @return {Object} formatted fields
         */
        format_fields: function(fields) {
            var key;

            // formatting avgs and salaries
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

            // adding birthplace property
            fields.birthplace = fields.city + ', ';
            fields.birthplace += (fields.country === '') ? fields.state : fields.country;

            return fields;
        }
    });

    /**
     * Controls View
     */
    MLB.Views.Controls = Backbone.View.extend({
        el: '.header',

        events: {
            'click li' : 'change_text',
            'click .update' : 'update'
        },

        /**
         * Changing text in the dropdown to user's selection
         * @param {Object} e Event
         */
        change_text: function(e) {
            var target = e.currentTarget,
                ul = $(target).parent(),
                key = ul.attr('id'),
                value = target.innerText;

            // change text in dropdown
            ul.siblings('button').text(value);

            // if we have a specific selection, set to model
            if (value !== '---') {
                value = (key === 'salary') ? value.match(/\d./) * 1000000 : value;

                this.set_model(key, value);
            }
        },

        /**
         * Setting attributes hash to the model
         * @param {String} key Attributes key
         * @param {String} value Attributes value
         */
        set_model: function(key, value) {
            var options = {};
            options[key] = value;

            model.set(options, { silent: true });
        },

        /**
         * Trigger model change, which fires a new search request
         */
        update: function() {
            model.trigger('change');
        }
    });

    var model = new MLB.Models.Players();

    new MLB.Views.Map(model);
    new MLB.Views.Controls();
});