export interface VariablePathDescription {
    path: string;
    line: number;
}

export interface VariablePathMap {
    [template: string]: VariablePathDescription[];
}