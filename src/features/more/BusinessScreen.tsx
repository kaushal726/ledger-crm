import { useState } from "react";
import { saveBusiness } from "../../data/actions";
import { businessOf } from "../../data/business";
import { useDB } from "../../data/store";
import { href, navigate } from "../../app/router";
import { Button } from "../../ui/Button";
import { TextField } from "../../ui/Field";
import { PageHeader } from "../../ui/layout";
import { useToast } from "../../ui/Toast";

const BACK = { label: "More", href: href("more") };

export function BusinessScreen() {
  const business = businessOf(useDB());
  const toast = useToast();
  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone);
  const [address, setAddress] = useState(business.address);
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) return setError("Enter the business name");
    saveBusiness({ name: name.trim(), phone: phone.trim(), address: address.trim() });
    toast("Business profile saved");
    navigate(BACK.href);
  };

  return (
    <>
      <PageHeader back={BACK} title="Business profile" />
      <TextField label="Business name" value={name} onChange={(v) => { setName(v); setError(""); }} error={error} hint="Shown at the top of the app and on every PDF." />
      <TextField label="Phone" optional value={phone} onChange={setPhone} type="tel" inputMode="tel" />
      <TextField label="Address" optional value={address} onChange={setAddress} />
      <Button variant="primary" block onClick={submit}>Save</Button>
    </>
  );
}
