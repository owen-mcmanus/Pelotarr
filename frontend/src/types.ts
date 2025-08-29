export type Race = {
    start: string;
    end: string | null;
    name: string;
    type: number;         // 1 = Classic, else Stage Race
    level: string;
    country: string;
    id: string;
    stages?: number;      // count of stages (optional)
};
