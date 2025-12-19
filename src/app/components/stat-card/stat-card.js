"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatCard = void 0;
var core_1 = require("@angular/core");
var common_1 = require("@angular/common");
var StatCard = function () {
    var _classDecorators = [(0, core_1.Component)({
            selector: 'app-stat-card',
            standalone: true,
            imports: [common_1.CommonModule],
            templateUrl: './stat-card.html',
            styleUrls: ['./stat-card.css'],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _value_decorators;
    var _value_initializers = [];
    var _value_extraInitializers = [];
    var _trend_decorators;
    var _trend_initializers = [];
    var _trend_extraInitializers = [];
    var _trendDirection_decorators;
    var _trendDirection_initializers = [];
    var _trendDirection_extraInitializers = [];
    var StatCard = _classThis = /** @class */ (function () {
        function StatCard_1() {
            this.title = __runInitializers(this, _title_initializers, '');
            this.value = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _value_initializers, ''));
            this.trend = (__runInitializers(this, _value_extraInitializers), __runInitializers(this, _trend_initializers, ''));
            this.trendDirection = (__runInitializers(this, _trend_extraInitializers), __runInitializers(this, _trendDirection_initializers, 'up'));
            __runInitializers(this, _trendDirection_extraInitializers);
        }
        return StatCard_1;
    }());
    __setFunctionName(_classThis, "StatCard");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _title_decorators = [(0, core_1.Input)()];
        _value_decorators = [(0, core_1.Input)()];
        _trend_decorators = [(0, core_1.Input)()];
        _trendDirection_decorators = [(0, core_1.Input)()];
        __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
        __esDecorate(null, null, _value_decorators, { kind: "field", name: "value", static: false, private: false, access: { has: function (obj) { return "value" in obj; }, get: function (obj) { return obj.value; }, set: function (obj, value) { obj.value = value; } }, metadata: _metadata }, _value_initializers, _value_extraInitializers);
        __esDecorate(null, null, _trend_decorators, { kind: "field", name: "trend", static: false, private: false, access: { has: function (obj) { return "trend" in obj; }, get: function (obj) { return obj.trend; }, set: function (obj, value) { obj.trend = value; } }, metadata: _metadata }, _trend_initializers, _trend_extraInitializers);
        __esDecorate(null, null, _trendDirection_decorators, { kind: "field", name: "trendDirection", static: false, private: false, access: { has: function (obj) { return "trendDirection" in obj; }, get: function (obj) { return obj.trendDirection; }, set: function (obj, value) { obj.trendDirection = value; } }, metadata: _metadata }, _trendDirection_initializers, _trendDirection_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        StatCard = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return StatCard = _classThis;
}();
exports.StatCard = StatCard;
