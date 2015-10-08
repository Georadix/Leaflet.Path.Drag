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
