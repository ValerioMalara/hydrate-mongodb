/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import PersisterImpl = require("../src/persisterImpl");
import model = require("./fixtures/model");
import SessionImpl = require("../src/sessionImpl");
import MockSessionFactory = require("./mockSessionFactory");
import MockCollection = require("./driver/mockCollection");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import EntityMapping = require("../src/mapping/entityMapping");
import MockIdentityGenerator = require("./id/mockIdentityGenerator");

import InternalSession = require("../src/internalSession");
import SessionFactoryImpl = require("../src/sessionFactoryImpl");
import SessionFactory = require("../src/sessionFactory");
import AnnotationMappingProvider = require("../src/mapping/providers/annotationMappingProvider");
import Configuration = require("../src/config/configuration");
import helpers = require("./helpers");

describe('PersisterImpl', () => {

    describe('findOneById', () => {

        it.skip('', (done) => {
            var factory = new MockSessionFactory();
            var registry = new MappingRegistry();
            factory.mapping = new EntityMapping(registry);
            factory.mapping.identity = new MockIdentityGenerator();
            factory.mapping.classConstructor = model.Person;
            registry.addMapping(factory.mapping);

            var session = new SessionImpl(factory);
            var collection = new MockCollection();
            var persister = new PersisterImpl(session, factory.mapping, collection);

            persister.findOneById(1, (err, entity) => {
                if(err) return done(err);
                done();
            });
            persister.findOneById(1, (err, entity) => {
                if(err) return done(err);
                done();
            });
        });
    });

    it.skip('save', (done) => {

        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/model.d.json");
        config.createSessionFactory((err: Error, sessionFactory: SessionFactory) => {
            if(err) throw err;

            var session = <SessionImpl>sessionFactory.createSession();

            var start = process.hrtime();
            var list: any[] = [];
            for(var j = 0; j < 1000; j++) {
                var person = new model.Person(new model.PersonName("Jones", "Bob"));
                person.phones = [new model.Phone("303-258-1111", model.PhoneType.Work)];

                for (var i = 0; i < 100; i++) {
                    var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
                    person.addParent(parent1);
                }

                list.push(person);
            }
            // divide by a million to get nano to milli
            var elapsed = process.hrtime(start);
            console.log("Created " + j + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");

            var start = process.hrtime();
            for(var i = 0; i < list.length; i++) {
                session.save(list[i]);
            }

            session.save(person, (err) => {
            //session.flush((err) => {
                if(err) return done(err);
                // divide by a million to get nano to milli
                var elapsed = process.hrtime(start);
                console.log("Saved " + j + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");
                done();
            });
        });
    });


    it.skip('performance test', (done) => {

        var mappingProvider = new AnnotationMappingProvider(new Configuration());
        mappingProvider.addFile("build/tests/fixtures/model.d.json");
        mappingProvider.getMapping((err, registry) => {
            if (err) return done(err);

            var fixture = helpers.requireFixture("model");
            var factory = new SessionFactoryImpl({}, registry);
            var session = <InternalSession>factory.createSession();
            var identity = (<EntityMapping>registry.getMappingForConstructor(model.Person).inheritanceRoot).identity;

            var mapping = registry.getMappingForConstructor(model.Person);

            var start = process.hrtime();

            for(var j = 0; j < 1000; j++) {
                var person = new model.Person(new model.PersonName("Jones", "Bob"));
                person.phones = [new model.Phone("303-258-1111", model.PhoneType.Work)];
                (<any>person)._id = identity.generate();
                person.addAttribute("eye color", "hazel");
                person.addAttribute("hair color", "brown");
                person.addAttribute("temperament", "angry");

                for (var i = 0; i < 100; i++) {
                    var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
                    (<any>parent1)._id = identity.generate();
                    person.addParent(parent1);
                }
            }

            // divide by a million to get nano to milli
            var elapsed = process.hrtime(start);
            console.log("Created " + j + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");

            var errors: any[] = [];
            var visited: any[] = [];
            var document = mapping.write(person, "", errors, visited);
            var obj = mapping.read(session, document, "", errors);
            // obj.parents = obj.parents.reverse();
            //obj.gender = model.Gender.Male;

            var start = process.hrtime();

            for(var i = 0; i < 10000; i++) {
                var errors: any[] = [];
                //                var visited: any[] = [];
                //                var document = mapping.write(person, "", errors, visited);
                var obj = mapping.read(session, document, null, errors);
                //                var changes: any = {};
                //                mapping.compare(obj, document, changes, "");
            }

            // divide by a million to get nano to milli
            var elapsed = process.hrtime(start);
            console.log("Processed " + i + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");

            done();
        });
    });

});