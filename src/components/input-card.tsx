"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  PrimitiveAtom,
  useAtom,
} from 'jotai'



type LocalPathFormProps = {
  title: string,
  description?: string,
  inputAtom: PrimitiveAtom<string>,
}
const LocalPathForm = (
  {
    title,
    description,
    inputAtom,
  }: LocalPathFormProps
) => {
  const [value, setValue] = useAtom<string>(inputAtom);
  const [lock, setLock] = React.useState<boolean>(true);

  // console.log(value); // Debug

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <Input
              id="source_dir"
              type="text"
              className="p-4 text-xs"
              defaultValue={value as string}
              onChange={(e) => setValue(e.target.value)}
              disabled={lock}
            />
          </form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button variant="default" onClick={() => setLock(!lock)}>{lock ? "変更" : "保存"}</Button>
        </CardFooter>
      </Card>
    </>
  );
}


export { LocalPathForm }