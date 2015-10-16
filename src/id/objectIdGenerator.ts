/// <reference path="../../typings/mongodb.d.ts" />

import mongodb = require("mongodb");
import ObjectID = mongodb.ObjectID;
import IdentityGenerator = require("./identityGenerator");

class ObjectIdGenerator implements IdentityGenerator {

    constructor() {
        // Turn on caching of the hex string representation of the ObjectID
        (<any>mongodb.ObjectID).cacheHexString = true;
    }

    generate(): any {
        return new ObjectID();
    }

    validate(value: any): boolean {

        if(value == null) return false;

        if(value._bsontype && value._bsontype == 'ObjectID') return true;

        return false;
    }

    fromString(text: string): any {

        // Return null if text passed in cannot possibly be a valid ObjectID
        if(text == null || text.length != 24) {
            return null;
        }

        return ObjectID.createFromHexString(text);
    }

    areEqual(first: any, second: any): boolean {
        return first.equals(second);
    }
}

export = ObjectIdGenerator;