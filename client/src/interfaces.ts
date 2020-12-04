export interface VariablePathDescription {
    path: string;
    line: number;
}

export interface VariablePathMap {
    [variable: string]: VariablePathDescription[];
}