import { signal } from "@preact/signals-react";


const count = signal(0);

export function Count() {
  return <p>{count}</p>
}


const query = useQuery$(() => {
  queryKey: ["profile"]
  queryFn: async () => {
    const res = await listProfiles();
    return res;
  }
})