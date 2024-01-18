# This file generated by `mix dagger.gen`. Please DO NOT EDIT.
defmodule Dagger.GitRef do
  @moduledoc "A git ref (tag, branch, or commit)."
  use Dagger.QueryBuilder
  @type t() :: %__MODULE__{}
  defstruct [:selection, :client]

  (
    @doc "The resolved commit id at this ref."
    @spec commit(t()) :: {:ok, Dagger.String.t()} | {:error, term()}
    def commit(%__MODULE__{} = git_ref) do
      selection = select(git_ref.selection, "commit")
      execute(selection, git_ref.client)
    end
  )

  (
    @doc "A unique identifier for this GitRef."
    @spec id(t()) :: {:ok, Dagger.GitRefID.t()} | {:error, term()}
    def id(%__MODULE__{} = git_ref) do
      selection = select(git_ref.selection, "id")
      execute(selection, git_ref.client)
    end
  )

  (
    @doc "The filesystem tree at this ref.\n\n\n\n## Optional Arguments\n\n* `ssh_known_hosts` - DEPRECATED: This option should be passed to `git` instead.\n* `ssh_auth_socket` - DEPRECATED: This option should be passed to `git` instead."
    @spec tree(t(), keyword()) :: Dagger.Directory.t()
    def tree(%__MODULE__{} = git_ref, optional_args \\ []) do
      selection = select(git_ref.selection, "tree")

      selection =
        if is_nil(optional_args[:ssh_known_hosts]) do
          selection
        else
          arg(selection, "sshKnownHosts", optional_args[:ssh_known_hosts])
        end

      selection =
        if is_nil(optional_args[:ssh_auth_socket]) do
          selection
        else
          {:ok, id} = Dagger.Socket.id(optional_args[:ssh_auth_socket])
          arg(selection, "sshAuthSocket", id)
        end

      %Dagger.Directory{selection: selection, client: git_ref.client}
    end
  )
end
