import Connection = require("./connection");
import ResultCallback = require("../resultCallback");
import IdentityGenerator = require("../id/identityGenerator");

interface DatabaseDriver {

    connect(url: string, options: any, callback: ResultCallback<Connection>): void;
    defaultIdentityGenerator(): IdentityGenerator;
}

export = DatabaseDriver;