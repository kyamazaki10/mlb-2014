$(function() {

    var MLB = {
        Models: {},
        Views: {}
    };

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
                center: [ 10.83331, -3.33984 ],
                zoom: 2
            });

            // get request data
            self.get_data();

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
                if (attributes.hasOwnProperty(key) && key !== 'position') {
                    operator = (key === 'salary') ? '>' : '=';

                    criteria += (count > 0) ? ' and ' : '';
                    criteria += key + operator + '?';

                    params.push(attributes[key]);

                    count++;
                }
            }

            // clear map and get request data
            this.cluster.clearLayers();
            this.get_data(attributes.position, criteria, params);
        },

        /**
         * Get data to be sent via ajax
         * @param {String} position Player position
         * @param {String} criteria Search criteria
         * @param {Array} params Search parameters
         */
        get_data: function(position, criteria, params) {
            var pos = position || '',
                crit = criteria || '',
                param = params || '',
                table_name,
                data;

            // if a position was specified
            if (position && position !== '') {
                table_name = (pos === 'Batters') ? 'batting' : 'pitching';

                data = 'hostedData=mqap.37172_mlb_' + table_name + '|' + crit + '|' + param;

            // else search all positions
            } else {
                data = 'hostedData=mqap.37172_mlb_batting|' + crit + '|' + param;
                data += '&hostedData=mqap.37172_mlb_pitching|' + crit + '|' + param;
            }

            // set max number of results returned
            data += '&maxMatches=1200';

            this.get_players(data);
        },

        /**
         * Getting players to display on map
         * @param {String} data Request data
         */
        get_players: function(data) {
            var self = this;

            // send ajax request to retrieve all players fitting the search criteria
            $.ajax({
                url: 'http://www.mapquestapi.com/search/v2/recordinfo?key=Jmjtd%7Cluu225u7ng%2C8x%3Do5-lz2a1',
                dataType: 'jsonp',
                data: data,
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
                template,
                fields,
                i;

            // set options for Leaflet.markercluster
            self.cluster = new L.MarkerClusterGroup({
                showCoverageOnHover: false,
                maxClusterRadius: 1
            });

            // get html markup needed for the popups
            for (i=0; i<players.length; i++) {
                template = (players[i].sourceName === 'mqap.121123_mlb_batting') ? 'batting' : 'pitching';
                fields = self.format_fields(players[i].fields);

                // store html to be used in popups
                html = self.render_popup(template, fields);

                // add marker to cluster
                self.cluster.addLayer(self.get_marker(fields.latitude, fields.longitude, html));
            }

            // add cluster to map and make it best fit
            self.map.addLayer(self.cluster);
            self.map.fitBounds(self.cluster.getBounds());
        },

        /**
         * Show error message when no players fit the search criteria
         */
        no_players: function() {
            $('.no-players').show().delay('3000').fadeOut();
        },

        /**
         * Getting markers and binding mouse event to display stats on click
         * @param {Number} lat Latitude of player hometown
         * @param {Number} lng Longitude of player hometown
         * @param {String} html HTML for popups
         * @return {Object} Leaflet marker
         */
        get_marker: function(lat, lng, html) {
            var marker = L.marker([ lat, lng ]).bindPopup(html);

            // open popup on click
            marker.on('click', function() {
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
            var self = this,
                url;

            // get appropriate template if we haven't already
            if (!self.templates[tmpl_name]) {
                url = 'assets/templates/' + tmpl_name + '.html';

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
                            break;
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
            if (!(/^--/.test(value))) {
                value = (key === 'salary') ? value.match(/\d./) * 1000000 : value;

                this.set_model(key, value);

            // else remove attribute from model
            } else {
                model.unset(key, { silent: true });
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