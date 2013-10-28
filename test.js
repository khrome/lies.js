var should = require("should");
var request = require("request");
var lie = require('./lies');

describe('lies', function(){

    describe('.covenant', function(){
    
        it('a single process resolves', function(done){
            var succeeded = false;
            var promise = new lie.covenant();
            promise.then(function(){
                succeeded = true;
            });
            setTimeout(function(){
                succeeded.should.equal(true);
                done();
            }, 100);
        });
        
        it('two processes resolve in sequence', function(done){
            var count = 0;
            var counted = 0;
            var promise = new lie.covenant();
            promise.then(function(){
                count++;
                count.should.equal(1);
                count--;
                count.should.equal(0);
                counted++;
            }).then(function(){
                count++;
                count.should.equal(1);
                count--;
                count.should.equal(0);
                counted++;
            }).then(function(){
                counted.should.equal(2);
                done();
            });
        });
        
        it('handles errors at the level it occurs at', function(done){
            var promise = new lie.covenant();
            promise.then(function(){
                throw new Error('OMG');
            }, function(ex){
                ex.message.should.equal('OMG');
                done();
            });
        });
        
        it('handles errors at the next level', function(done){
            var promise = new lie.covenant();
            promise.then(function(){
                throw new Error('OMG');
            }).then(function(){
                should.fail('should not make it here');
            }, function(ex){
                ex.message.should.equal('OMG');
                done();
            });
        });
        
        it('passes thru functional returns', function(done){
            var promise = new lie.covenant();
            promise.then(function(){
                return 'something';
            }).then(function(thing){
                thing.should.equal('something');
                done();
            });
        });
        
        it('passes forward functional returns when callback is missing', function(done){
            var promise = new lie.covenant();
            promise.then(function(){
                return 'something';
            }).then(undefined, function(){
                //nothing to see here
            }).then(function(thing){
                thing.should.equal('something');
                done();
            });;
        });
        
    });
});