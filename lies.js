(function(){
    var sift = require('sift');
    var lie = function(state){
        this.state = state || 'initialized';
        this.transitions = {};
        this.states = [];
        this.values = [];
    };
    lie.prototype = {
        assess : function(){
            if(this.transitions[this.state]) this.transitions[this.state].forEach(function(transition, index){
                if(transition.test() && transition.callback() === false) return false;
            });
        },
        pledge : function(state, conditions, callback){
            if(!callback) (callback = conditions) && (conditions = function(){ return true; });
            if(typeof states == 'string') states = [states];
            var ob = this;
            if(!ob.transitions[state]) ob.transitions[state] = [];
            if(typeof conditions != 'function'){
                var cond = conditions;
                conditions = function(){
                    return sift(cond, [ob.values[index]]).length == 1;
                }
            }
            ob.transitions[state].push({
                test : conditions,
                callback : callback
            });
            this.assess();
        },
        equivocate : function(states, conditions, finalState){
            var ob = this;
            this.pledge(states, conditions, function(){
                ob.state = finalState;
                return false; //if transition occurs, process no more events
            });
        }
    }
    var lies = lie;
    lie.covenant = function(){
        this.lie = new lies('pending');
        var lie = this.lie;
        this.calls = {};
        var calls = this.calls;
        lie.equivocate('pending', function(){ //if pending and all resolved, resolve
            if(lie.states.indexOf('pending') != -1) return false;
            if(lie.states.indexOf('rejected') != -1) return false;
            else return true;
        },'resolved');
        lie.equivocate('pending', function(){ //if pending and had an rejection, rejected
            if(lie.states.indexOf('pending') != -1) return false;
            if(lie.states.indexOf('rejected') != -1) return true;
            else return false;
        },'rejected');
        lie.pledge('pending', function(){ //pledge to process the next item while pending
            var index;
            if((index = lie.states.indexOf('pending')) != -1){
                var rejectedIndex;
                var wasRejected = ((rejectedIndex = lie.states.indexOf('rejected')) != -1)?
                    lie.values[rejectedIndex]:
                    false;
                if(lie.states[index].when){
                    lie.states[index].lie.assess(); //make sure the inner lie is acting
                }else{
                    setTimeout(function(){
                        try{
                            if(wasRejected){
                                lie.values[index] = calls[index].error(wasRejected);
                                lie.states[index] = 'skipped'; //mark this as skipped because we error out before it
                            }else{
                                var lastResult = index-1;
                                while(lastResult > 0 && calls[lastResult].callback == undefined) lastResult--;
                                if(calls[index].callback) lie.values[index] = calls[index].callback(lie.values[lastResult]);
                                lie.states[index] = 'resolved'; //mark this as skipped because we error out before it
                            }
                        }catch(ex){
                            lie.values[index] = ex;
                            lie.states[index] = 'rejected';
                            if(calls[index].error) calls[index].error(ex);
                        }
                        lie.assess();
                    }, 0);
                }
            }//else console.log('not pending');
        });
    };
    lie.covenant.prototype = {
        then :function(callback, error){
            var lie = this.lie;
            var position = lie.states.length;
            if(callback && callback.then){
                lie.states[position] = callback;
            }else{
                this.calls[position] = {
                    callback : callback,
                    error : error
                }
                lie.states[position] = 'pending';
            }
            if(lie.state != 'pending'){
                lie.state = 'pending';
                lie.assess();
            }
            return this; //this is the controversial bit, as returning a new covenant is wasteful
        },
        toString : function(){
            return this.lie.state;
        }
    }
    
    /*
    
    lie.covenant.interactive = function(){
        this.lie = new lie();
    };
    
    lie.covenant.interactive.prototype = {
        then : lie.covenant.prototype.then,
        get : function(){
            var lie = this.lie;
            return function(){
            
            }
        },
        call : function(){
            var fName = arguments[0];
            var args = Array.prototype.slice.apply(arguments, [1]);
            
        }
    };*/
    
    module.exports = lie;
})();