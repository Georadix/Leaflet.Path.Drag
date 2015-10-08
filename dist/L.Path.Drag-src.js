/**
 * Delta translate of path coordinates.
 */

"use strict";

L.Path.include({
    /**
     * Applies translation to the path.
     * @param {Number} deltaLng The delta in longitude.
     * @param {Number} deltaLat The delta in latitude.
     */
    _applyTranslation: function (deltaLng, deltaLat) {
        var translatedLatLngs = [];

        this.getLatLngs().forEach(function (latLng) {
            translatedLatLngs.push(L.latLng(latLng.lat - deltaLat, latLng.lng - deltaLng));
        });

        this.setLatLngs(translatedLatLngs);
        this.redraw();
    },

    /**
     * Check if the feature was dragged, that'll supress the click event
     * on mouseup. That fixes popups for example
     *
     * @param  {MouseEvent} e
     */
    _onMouseClick: function (e) {
        if ((this.dragging && this.dragging.moved()) ||
          (this._map.dragging && this._map.dragging.moved())) {
            return;
        }

        this._fireMouseEvent(e);
    }
});
/**
 * Leaflet vector features drag functionality
 * @preserve
 */

"use strict";

/**
 * Drag handler
 * @class L.Path.Drag
 * @extends {L.Handler}
 */
L.Handler.PathDrag = L.Handler.extend( /** @lends  L.Path.Drag.prototype */ {
    /**
     * @param  {L.Path} path
     * @constructor
     */
    initialize: function (path) {
        /**
         * @type {L.Path}
         */
        this._path = path;

        /**
         * @type {L.Point}
         */
        this._startLatLng = null;

        /**
         * @type {L.Point}
         */
        this._dragStartLng = null;
    },

    /**
     * Enable dragging
     */
    addHooks: function () {
        this._path.on('mousedown', this._onDragStart, this);
        if (!L.Path.CANVAS) {
            L.DomUtil.addClass(this._path._container, 'leaflet-path-draggable');
        }
    },

    /**
     * Disable dragging
     */
    removeHooks: function () {
        this._path.off('mousedown', this._onDragStart, this);
        if (!L.Path.CANVAS) {
            L.DomUtil.removeClass(this._path._container, 'leaflet-path-draggable');
        }
    },

    /**
     * @return {Boolean}
     */
    moved: function () {
        return this._path._dragMoved;
    },

    /**
     * Start drag
     * @param  {L.MouseEvent} evt
     */
    _onDragStart: function (evt) {
        this._startLatLng = L.latLng(evt.latlng.lat, evt.latlng.lng);
        this._dragStartLng = L.latLng(evt.latlng.lat, evt.latlng.lng);

        this._path._map
          .on('mousemove', this._onDrag, this)
          .on('mouseup', this._onDragEnd, this)
        this._path._dragMoved = false;
    },

    /**
     * Dragging
     * @param  {L.MouseEvent} evt
     */
    _onDrag: function (evt) {
        var lng = evt.latlng.lng;
        var lat = evt.latlng.lat;

        var dLng = this._startLatLng.lng - lng;
        var dLat = this._startLatLng.lat - lat;

        if (!this._path._dragMoved && (dLng || dLat)) {
            this._path._dragMoved = true;
            this._path.fire('dragstart', {
                latLng: this._startLatLng
            });

            if (this._path._popup) {
                this._path._popup._close();
                this._path.off('click', this._path._openPopup, this._path);
            }
        }
        this._startLatLng = L.latLng(lat, lng);
        if (!this._path.options.draggable.eventsOnly) {
            this._path._applyTranslation(dLng, dLat);
        }
        this._path.fire('drag', {
            latLng: evt.latlng
        });
        L.DomEvent.stop(evt.originalEvent);
    },

    /**
     * Dragging stopped, apply
     * @param  {L.MouseEvent} evt
     */
    _onDragEnd: function (evt) {
        L.DomEvent.stop(evt);

        this._path._map
          .off('mousemove', this._onDrag, this)
          .off('mouseup', this._onDragEnd, this);

        // consistency
        this._path.fire('dragend', {
            latLng: evt.latlng
        });

        if (this._path._popup) {
            L.Util.requestAnimFrame(function () {
                this._path.on('click', this._path._openPopup, this._path);
            }, this);
        }

        this._startLatLng = null;
        this._dragStartLng = null;
        this._path._dragMoved = false;
    },
});

L.Path.prototype.__initEvents = L.Path.prototype._initEvents;
L.Path.prototype._initEvents = function () {
    this.__initEvents();

    if (this.options.draggable) {
        if (this.dragging) {
            this.dragging.enable();
        } else {
            this.dragging = new L.Handler.PathDrag(this);
            this.dragging.enable();
        }
    } else if (this.dragging) {
        this.dragging.disable();
    }
};
(function() {

  // listen and propagate dragstart on sub-layers
  L.FeatureGroup.EVENTS += ' dragstart';

  function wrapMethod(klasses, methodName, method) {
    for (var i = 0, len = klasses.length; i < len; i++) {
      var klass = klasses[i];
      klass.prototype['_' + methodName] = klass.prototype[methodName];
      klass.prototype[methodName] = method;
    }
  }

  /**
   * @param {L.Polygon|L.Polyline} layer
   * @return {L.MultiPolygon|L.MultiPolyline}
   */
  function addLayer(layer) {
    if (this.hasLayer(layer)) {
      return this;
    }
    layer
      .on('drag', this._onDrag, this)
      .on('dragend', this._onDragEnd, this);
    return this._addLayer.call(this, layer);
  }

  /**
   * @param  {L.Polygon|L.Polyline} layer
   * @return {L.MultiPolygon|L.MultiPolyline}
   */
  function removeLayer(layer) {
    if (!this.hasLayer(layer)) {
      return this;
    }
    layer
      .off('drag', this._onDrag, this)
      .off('dragend', this._onDragEnd, this);
    return this._removeLayer.call(this, layer);
  }

  // duck-type methods to listen to the drag events
  wrapMethod([L.MultiPolygon, L.MultiPolyline], 'addLayer', addLayer);
  wrapMethod([L.MultiPolygon, L.MultiPolyline], 'removeLayer', removeLayer);

  var dragMethods = {
    _onDrag: function(evt) {
      var layer = evt.target;
      this.eachLayer(function(otherLayer) {
        if (otherLayer !== layer) {
          otherLayer._applyTransform(layer.dragging._matrix);
        }
      });

      this._propagateEvent(evt);
    },

    _onDragEnd: function(evt) {
      var layer = evt.target;

      this.eachLayer(function(otherLayer) {
        if (otherLayer !== layer) {
          otherLayer._resetTransform();
          otherLayer.dragging._transformPoints(layer.dragging._matrix);
        }
      });

      this._propagateEvent(evt);
    }
  };

  L.MultiPolygon.include(dragMethods);
  L.MultiPolyline.include(dragMethods);

})();
