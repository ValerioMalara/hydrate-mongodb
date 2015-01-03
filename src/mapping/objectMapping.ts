import Map = require("../core/map");
import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import PropertyFlags = require("./propertyFlags");
import Property = require("./property");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");

class ObjectMapping extends MappingBase {

    properties: Property[] = [];
    private _propertiesByName: Map<Property> = {};
    private _propertiesByField: Map<Property> = {};

    constructor() {
        super(MappingFlags.Object|MappingFlags.Embeddable);
    }

    addProperty(property: Property): void {

        var name = property.name;
        if(Map.hasProperty(this._propertiesByName, name)) {
            throw new Error("There is already a mapped property with the name '" + name + "'.");
        }
        this._propertiesByName[name] = property;

        if(Map.hasProperty(this._propertiesByField, property.field)) {
            throw new Error("There is already a mapped property for field '" + property.field + "'.");
        }
        this._propertiesByField[property.field] = property;

        this.properties.push(property);
    }

    getProperty(name: string): Property {

        return Map.getProperty(this._propertiesByName, name);
    }

    getPropertyForField(field: string): Property {

        return Map.getProperty(this._propertiesByField, field);
    }

    getProperties(flags?: PropertyFlags): Property[] {

        if(!flags) {
            return this.properties;
        }

        // TODO: cache search results

        var ret: Property[] = [];
        var properties = this.properties;
        for(var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];
            if((property.flags & flags) !== 0) {
                ret.push(property)
            }
        }
        return ret;
    }

    read(value: any, path: string, errors: MappingError[]): any {

        return this.readObject({}, value, path, errors);
    }

    protected readObject(obj: any, value: any, path: string, errors: MappingError[]): any {

        var base = path ? path + "." : "",
            properties = this.properties,
            propertyValue: any;

        for(var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];

            // skip fields that are not persisted
            if(property.flags & (PropertyFlags.Ignored | PropertyFlags.InverseSide)) {
                continue;
            }
            // TODO: how to handle inverse side of reference? probably should be in the code that does reference population

            var fieldValue = property.getFieldValue(value);
            if(fieldValue === undefined) {
                // skip undefined values
                continue;
            }
            if(fieldValue === null) {
                // skip null values unless allowed
                if(!(property.flags & PropertyFlags.Nullable)) {
                    continue;
                }
                propertyValue = null;
            }
            else {
                propertyValue = property.mapping.read(fieldValue, base + property.name, errors);
            }

            property.setPropertyValue(obj, propertyValue);
        }

        return obj;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {


        return this.writeObject({}, value, path, errors, visited);
    }

    protected writeObject(document: any, value: any, path: string, errors: MappingError[], visited: any[]): any {

        var base = path ? path + "." : "",
            properties = this.properties,
            fieldValue: any;

        if(visited.indexOf(value) !== -1) {
            errors.push({ message: "Recursive reference of embedded object is not allowed.", path: path, value: value });
            return;
        }
        visited.push(value);

        for(var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i],
                flags = property.flags;

            // skip fields that are not persisted
            if(flags & (PropertyFlags.Ignored | PropertyFlags.InverseSide)) {
                continue;
            }

            var propertyValue = property.getPropertyValue(value);
            if(propertyValue === undefined) {
                // skip undefined values
                continue;
            }
            if(propertyValue === null) {
                // skip null values unless allowed
                if(!(flags & PropertyFlags.Nullable)) {
                    continue;
                }
                fieldValue = null;
            }
            else {
                fieldValue = property.mapping.write(propertyValue, base + property.name, errors, visited);
            }
            property.setFieldValue(document, fieldValue);
        }

        visited.pop();

        return document;
    }

    walk(value: any, path: string): void {

    }

    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        this.compareObject(objectValue, documentValue, changes, path);
    }

    protected compareObject(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        // TODO: throw error if objectValue is not an object.
        // TODO: throw error if objectValue or documentValue are null or undefined?
        // TODO: handle errors/visited
        // TODO: perhaps maintain documentPath and objectPath?
        // TODO: see if optimization similar to setFieldValue works here

        // check if document value is not an object
        if(typeof documentValue !== "object" || Array.isArray(documentValue) || (documentValue instanceof Date) || (documentValue instanceof RegExp)) {

            (changes["$set"] || (changes["$set"] = {}))[path] = this.write(objectValue, path, [], []);
            return;
        }

        var base = path ? path + "." : "",
            properties = this.properties;

        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i],
                flags = property.flags;

            // skip fields that are not persisted
            if (flags & (PropertyFlags.Ignored | PropertyFlags.InverseSide)) {
                continue;
            }

            // get the field value from the document
            var fieldValue = property.getFieldValue(documentValue);

            // get the property value from the object
            var propertyValue = property.getPropertyValue(objectValue);
            // handle null properties as undefined if property is not nullable
            if (propertyValue === null && !(flags & PropertyFlags.Nullable)) {
                propertyValue = undefined;
            }

            if (propertyValue === fieldValue) {
                continue;
            }

            // check for undefined property
            if (propertyValue === undefined) {
                (changes["$unset"] || (changes["$unset"] = {}))[base + property.field] = 1;
                continue;
            }

            // check for null property
            if (propertyValue === null) {
                (changes["$set"] || (changes["$set"] = {}))[base + property.field] = null;
            }

            // check for null or undefined field
            if (fieldValue === undefined || fieldValue === null) {
                (changes["$set"] || (changes["$set"] = {}))[base + property.field] = property.mapping.write(propertyValue, base + property.field, [], []);
                continue;
            }

            // check for changed values
            property.mapping.compare(propertyValue, fieldValue, changes, base + property.field);
        }
    }
}

export = ObjectMapping;