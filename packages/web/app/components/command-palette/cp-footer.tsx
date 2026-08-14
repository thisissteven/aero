import { Command, Kbd } from '@aero/ui';

export function CommandPaletteFooter() {
  return (
    <Command.Footer className='justify-between [&_kbd]:h-5 [&_kbd]:text-xs'>
      <div className='flex items-center gap-3'>
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-0.5'>
            <Kbd className='text-xs'>
              <Kbd.Abbr keyValue='up' />
            </Kbd>
            <Kbd className='text-xs'>
              <Kbd.Abbr keyValue='down' />
            </Kbd>
          </div>
          <span>Navigate</span>
        </div>

        <div className='flex items-center gap-2'>
          <Kbd>
            <Kbd.Abbr keyValue='enter' />
          </Kbd>
          <span>Open chat</span>
        </div>
      </div>
    </Command.Footer>
  );
}
