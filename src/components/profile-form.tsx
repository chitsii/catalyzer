"use client";

// Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// State
import { useAtom } from "jotai";
import { Profile, refreshSettingAtom } from "@/components/atoms";

// Utils
import { addProfile, editProfile } from "@/lib/api";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// i18n
import "@/i18n/config";
import { useTranslation } from "@/i18n/config";

const profileFormSchema = z.object({
  name: z.string().min(1).max(20).trim(),
  game_path: z
    .string()
    .max(255)
    .trim()
    .refine((value) => {
      return value.endsWith("cataclysm-tiles.exe") || value.endsWith("Cataclysm.app");
    }, "Game path must end with cataclysm-tiles.exe or Cataclysm.app"),
});

type ProfileFormProps = {
  targetProfile?: Profile;
  isUpdate?: boolean;
  handleDialogItemOpenChange: (open: boolean) => void;
};
const ProfileForm = ({ targetProfile, isUpdate, handleDialogItemOpenChange }: ProfileFormProps) => {
  const { t } = useTranslation();

  const [_, refresh] = useAtom(refreshSettingAtom);
  const defaultValues = targetProfile
    ? {
        name: targetProfile.name,
        game_path: targetProfile.game_path || "",
      }
    : {
        name: "",
        game_path: "",
      };
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: defaultValues,
  });

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    const handleAddProfile = async (name: string, gamePath: string) => {
      await addProfile(name, gamePath);
      form.reset();
      refresh();
    };

    const handleEditProfile = async (id: string, name: string, gamePath: string) => {
      await editProfile(id, name, gamePath);
      form.reset();
      refresh();
    };

    targetProfile
      ? await handleEditProfile(targetProfile.id, values.name, values.game_path)
      : await handleAddProfile(values.name, values.game_path);

    refresh(); // refresh settings
    handleDialogItemOpenChange(false); // close dialog
  };

  const InputField = ({
    name,
    title,
    disabled,
  }: {
    name: "name" | "game_path";
    title: string;
    disabled?: boolean | undefined;
  }) => {
    return (
      <FormField
        name={name}
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">{title}</FormLabel>
            <FormControl>
              <Input
                {...field}
                disabled={disabled}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        {InputField({ name: "name", title: t("profile_name"), disabled: isUpdate })}
        {InputField({ name: "game_path", title: t("game_path"), disabled: false })}
        <Button
          type="submit"
          onClick={async () => {
            const isValid = await form.trigger();
            if (!isValid) return;
          }}
        >
          Submit
        </Button>
      </form>
    </Form>
  );
};

export { ProfileForm };
