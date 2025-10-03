import { Fragment, useState } from 'react';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { EllipsisVerticalIcon, PencilIcon, TrashIcon, ArrowRightOnRectangleIcon, UserPlusIcon, BellIcon, BellSlashIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { channelService } from '../services/channel';
import { archiveService } from '../services/archive';
import toast from 'react-hot-toast';

interface ChannelSettingsDropdownProps {
  channel: {
    id: string;
    workspaceId: string;
    name: string;
    description?: string;
    topic?: string;
    isMember: boolean;
    userRole?: string;
    isMuted?: boolean;
  };
  onChannelUpdated: () => void;
}

export default function ChannelSettingsDropdown({ channel, onChannelUpdated }: ChannelSettingsDropdownProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [topic, setTopic] = useState(channel.topic || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const navigate = useNavigate();

  const isAdmin = channel.userRole === 'owner' || channel.userRole === 'admin';

  const handleEdit = async () => {
    if (!name.trim()) {
      toast.error('Channel name is required');
      return;
    }

    try {
      setSaving(true);
      await channelService.updateChannel(channel.workspaceId, channel.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        topic: topic.trim() || undefined,
      });
      toast.success('Channel updated');
      onChannelUpdated();
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Failed to update channel:', error);
      toast.error('Failed to update channel');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await channelService.deleteChannel(channel.workspaceId, channel.id);
      toast.success('Channel deleted');
      navigate(`/workspace/${channel.workspaceId}`);
    } catch (error: any) {
      console.error('Failed to delete channel:', error);
      toast.error('Failed to delete channel');
    } finally {
      setDeleting(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this channel?')) {
      return;
    }

    try {
      await channelService.leaveChannel(channel.workspaceId, channel.id);
      toast.success('Left channel');
      navigate(`/workspace/${channel.workspaceId}`);
    } catch (error: any) {
      console.error('Failed to leave channel:', error);
      toast.error('Failed to leave channel');
    }
  };

  const handleJoin = async () => {
    try {
      await channelService.joinChannel(channel.workspaceId, channel.id);
      toast.success('Joined channel');
      onChannelUpdated();
    } catch (error: any) {
      console.error('Failed to join channel:', error);
      toast.error('Failed to join channel');
    }
  };

  const handleToggleMute = async () => {
    try {
      if (channel.isMuted) {
        await channelService.unmuteChannel(channel.workspaceId, channel.id);
        toast.success('Channel unmuted');
      } else {
        await channelService.muteChannel(channel.workspaceId, channel.id);
        toast.success('Channel muted');
      }
      onChannelUpdated();
    } catch (error: any) {
      console.error('Failed to toggle mute:', error);
      toast.error('Failed to update channel');
    }
  };

  const handleArchive = async () => {
    try {
      setArchiving(true);
      await archiveService.archiveChannel(channel.workspaceId, channel.id);
      toast.success('Channel archived');
      navigate(`/workspace/${channel.workspaceId}`);
    } catch (error: any) {
      console.error('Failed to archive channel:', error);
      toast.error('Failed to archive channel');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <>
      <Menu as="div" className="relative">
        <Menu.Button className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors">
          <EllipsisVerticalIcon className="w-5 h-5" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
            <div className="py-1">
              {!channel.isMember && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleJoin}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700`}
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      Join Channel
                    </button>
                  )}
                </Menu.Item>
              )}

              {channel.isMember && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleToggleMute}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700`}
                    >
                      {channel.isMuted ? (
                        <>
                          <BellIcon className="w-4 h-4" />
                          Unmute Channel
                        </>
                      ) : (
                        <>
                          <BellSlashIcon className="w-4 h-4" />
                          Mute Channel
                        </>
                      )}
                    </button>
                  )}
                </Menu.Item>
              )}

              {channel.isMember && isAdmin && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700`}
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit Channel
                    </button>
                  )}
                </Menu.Item>
              )}

              {channel.isMember && channel.name !== 'general' && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLeave}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700`}
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      Leave Channel
                    </button>
                  )}
                </Menu.Item>
              )}

              {channel.isMember && isAdmin && channel.name !== 'general' && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setShowArchiveConfirm(true)}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700`}
                    >
                      <ArchiveBoxIcon className="w-4 h-4" />
                      Archive Channel
                    </button>
                  )}
                </Menu.Item>
              )}

              {channel.isMember && isAdmin && channel.name !== 'general' && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600`}
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete Channel
                    </button>
                  )}
                </Menu.Item>
              )}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

      {/* Edit Modal */}
      <Transition appear show={showEditModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowEditModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                    Edit Channel
                  </Dialog.Title>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Channel Name
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">#</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Topic
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="What's this channel about?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleEdit}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setShowEditModal(false)}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Archive Confirmation */}
      <Transition appear show={showArchiveConfirm} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowArchiveConfirm(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                    Archive Channel
                  </Dialog.Title>

                  <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to archive <strong>#{channel.name}</strong>?
                    Members won't be able to send messages, but all history will be preserved and the channel can be unarchived later.
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleArchive}
                      disabled={archiving}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                      {archiving ? 'Archiving...' : 'Archive Channel'}
                    </button>
                    <button
                      onClick={() => setShowArchiveConfirm(false)}
                      disabled={archiving}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation */}
      <Transition appear show={showDeleteConfirm} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowDeleteConfirm(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                    Delete Channel
                  </Dialog.Title>

                  <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to delete <strong>#{channel.name}</strong>? This action cannot be undone.
                    All messages will be permanently deleted.
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete Channel'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
