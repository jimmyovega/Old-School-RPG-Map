/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Old School RPG Map.
 *
 * The Initial Developer of the Original Code is Jono Xia.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Jono Xia <jono@mozilla.com>
 *   Gaurav Munjal <Gaurav0@aol.com>
 *   Jebb Burditt <jebb.burditt@gmail.com>
 *   David Leonard <sephirothcloud1025@yahoo.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
 

// Directions of a character
var FACING_UP = 0;
var FACING_RIGHT = 1;
var FACING_DOWN = 2;
var FACING_LEFT = 3;

/* Class representing either a player character or NPC
 * Characters can either stay still or move about the map. */
var Character = Sprite.extend({
   _init: function(x, y, imgRef, subMapId, dir) {
        this._super(x, y, SPRITE_WIDTH, SPRITE_HEIGHT, imgRef, subMapId);
        
        this._dir = dir;

        // Are we currently walking?
        this._walking = false;

        // Have we just entered a new area? (Prevent enter chaining.)
        this._entered = false;
    },
    
    getDir: function() {
        return this._dir;
    },
    
    /* Get coordinates the sprite is facing */
    getFacingCoords: function() {
        var x = this._x;
        var y = this._y
        switch(this._dir) {
            case FACING_UP:
                y--;
                break;
            case FACING_DOWN:
                y++;
                break;
            case FACING_LEFT:
                x--;
                break;
            case FACING_RIGHT:
                x++;
                break;
        }
        return [ x, y ];
    },
    
    /* Faces the direction *opposite* the one player is facing */
    facePlayer: function() {
        switch(g_player.getDir()) {
            case FACING_UP:
                this._dir = FACING_DOWN;
                break;
            case FACING_DOWN:
                this._dir = FACING_UP;
                break;
            case FACING_LEFT:
                this._dir = FACING_RIGHT;
                break;
            case FACING_RIGHT:
                this._dir = FACING_LEFT;
                break;
        }
        this.clear();
        this.plot();
    },

    /* Draws the sprite onto the map (unless its position is offscreen,
     * or on a different map):*/
    plot: function(sourceOffsetX, sourceOffsetY, destOffsetX, destOffsetY) {

        // Quick fix for race condition
        if (this._walking && destOffsetX === undefined && destOffsetY === undefined)
            return;
        
        // select sprite from sprite image based on direction
        var newSourceOffsetY = SPRITE_HEIGHT * this._dir;
        
        // apply sourceOffsetX if available
        var newSourceOffsetX = SPRITE_WIDTH;
        if (sourceOffsetX != undefined)
            newSourceOffsetX += sourceOffsetX; 
        
        // calls inherited version of plot
        this._super(newSourceOffsetX, newSourceOffsetY, destOffsetX, destOffsetY);
    },

    /* Sprite will attempt to move by deltaX in the east-west dimension
     * and deltaY in the north-south dimension.  Returns true if success
     * and false if blocked somehow. */
    move: function( deltaX, deltaY, dir ) {
        
        this._dir = dir;
        
        var newX = this._x + deltaX;
        var newY = this._y + deltaY;
        
        // Make sure you're not walking off edge of the world and
        // the square we're trying to enter is passable and not occupied:
        if (!g_worldmap.pointInBounds(newX, newY) ||
                !g_worldmap.isPassable(newX, newY) ||
                g_worldmap.isOccupied(newX, newY)) {
            if (!g_worldmap.isAnimating()) {
                this.clear();
                this.plot();
            }
            return false;
        }
            
        this.clear();
        this._prevX = this._x;
        this._prevY = this._y;
        this._x += deltaX;
        this._y += deltaY;

        if (this == g_player) {
            var scrolling = g_worldmap.autoScrollToPlayer(this._x, this._y);
            if (scrolling)
                this.scrollAnimation();
            else
                this.walkAnimation(deltaX, deltaY);
               
            // Any effects of stepping on the new square:
            this._entered = false;
            var sprite = this;
            g_worldmap.runAfterAnimation(function() {
                if (!sprite._entered)
                    sprite.getSquareUnderfoot().onEnter();
                sprite._entered = true;
            });
        }      
        
        return true;
    },

    // Changes the info when the sprite enters a new submap
    enterNewSubMap: function(subMapId, x, y, dir) {
        this._x = x;
        this._y = y;
        this._dir = dir;
        this._subMap = subMapId;
    },

    // Returns the map square the sprite is standing on.
    getSquareUnderfoot: function() {
        return g_worldmap.getSquareAt(this._x, this._y);
    },
    
    /* Show sprite as walking as background scrolls */
    scrollAnimation: function() {
        if (g_worldmap.isScrolling()) {
            this.scrollAnimationSub(0);
        }
    },
    
    /* Recursive part of sprite.scrollAnimation */
    scrollAnimationSub: function(animStage) {
        if (g_worldmap.isScrolling() && !g_battle) {
            
            // Determine source offset in sprite image based on animation stage.
            this.clear();
            var sourceOffsetX = 0;
            if (animStage == 2 || animStage == 3)
                sourceOffsetX = -SPRITE_WIDTH;
            else if (animStage == 6 || animStage == 7)
                sourceOffsetX = SPRITE_WIDTH;
            this.plot(sourceOffsetX);
            
            var sprite = this;
            window.setTimeout(function() {
                sprite.scrollAnimationSub((animStage + 1) % 8);
            }, 1000 / FPS);
        } else if (!g_battle) {
            this.clear();
            this.plot();
        }
    },
    
    /* Shows the sprite walking from one square to another */
    walkAnimation: function(deltaX, deltaY) {
        if (g_worldmap.isAnimating()) {
            var sprite = this;
            g_worldmap.runAfterAnimation(function() {
                sprite.walkAnimation(deltaX, deltaY);
            });
        } else if (!g_battle) {
            g_worldmap.startAnimating();
            this._walking = true;
            var numSteps =  ((deltaY != 0) ? TILE_HEIGHT : TILE_WIDTH) / SCROLL_FACTOR;
            var destOffsetX = -deltaX * TILE_WIDTH;
            var destOffsetY = -deltaY * TILE_HEIGHT;
            this.walkAnimationSub(0, deltaX, deltaY, destOffsetX, destOffsetY, numSteps);
        }
    },
    
    /* Recursive part of sprite.walkAnimation */
    walkAnimationSub: function(animStage, deltaX, deltaY, destOffsetX, destOffsetY, numSteps) {
        if (numSteps > 1 && !g_battle) {
            this.clear(destOffsetX, destOffsetY);
            
            // Determine source offset in sprite image based on animation stage.
            var sourceOffsetX = 0;
            if (animStage == 2 || animStage == 3)
                sourceOffsetX = -SPRITE_WIDTH;
            else if (animStage == 6 || animStage == 7)
                sourceOffsetX = SPRITE_WIDTH;
    
            destOffsetX += deltaX * SCROLL_FACTOR;
            destOffsetY += deltaY * SCROLL_FACTOR;
            this.plot(sourceOffsetX, 0, destOffsetX, destOffsetY);
            
            var sprite = this;
            window.setTimeout(function() {
                sprite.walkAnimationSub((animStage + 1) % 8, deltaX, deltaY, destOffsetX, destOffsetY, --numSteps);
            }, 1000 / FPS);
        } else {
            this._walking = false;
            if (!g_battle) {
                this.clear(destOffsetX, destOffsetY); // clear last image drawn
                this.plot();
            }
            g_worldmap.finishAnimating();
            if (!g_battle)
                handleBufferedKey();
        }
    }
});