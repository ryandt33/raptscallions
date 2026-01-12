/**
 * Test factory utilities for creating mock data
 * Used by unit tests to create valid test data structures
 */
export declare function createMockUser(overrides?: Record<string, unknown>): {
    email: string;
    name: string;
};
export declare function createMockGroup(overrides?: Record<string, unknown>): {
    name: string;
    parentId: string;
    settings: {};
};
export declare function createMockCreateUser(overrides?: Record<string, unknown>): {
    email: string;
    name: string;
};
export declare function createMockUpdateUser(overrides?: Record<string, unknown>): {
    [x: string]: unknown;
};
export declare function createMockCreateGroup(overrides?: Record<string, unknown>): {
    name: string;
    parentId: string;
    settings: {};
};
export declare function createMockUpdateGroup(overrides?: Record<string, unknown>): {
    [x: string]: unknown;
};
export declare const invalidUserData: {
    missingEmail: {
        name: string;
    };
    missingName: {
        email: string;
    };
    invalidEmail: {
        email: string;
        name: string;
    };
    emptyName: {
        email: string;
        name: string;
    };
    nameTooLong: {
        email: string;
        name: string;
    };
};
export declare const invalidGroupData: {
    missingName: {
        settings: {};
    };
    emptyName: {
        name: string;
        settings: {};
    };
    nameTooLong: {
        name: string;
        settings: {};
    };
    invalidParentId: {
        name: string;
        parentId: string;
        settings: {};
    };
};
//# sourceMappingURL=factories.d.ts.map